// Package s3 wraps the AWS SDK for Go v2 to talk to any S3-compatible
// storage (Cloudflare R2, Amazon S3, Alibaba Cloud OSS, Tencent COS,
// MinIO, …) through one uniform interface.
package s3

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	s3sdk "github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// Config describes one storage connection.
type Config struct {
	Endpoint  string // e.g. https://<accountid>.r2.cloudflarestorage.com
	Region    string // e.g. auto (R2), us-east-1 (S3), oss-cn-hangzhou (OSS)
	AccessKey string
	SecretKey string
	// UsePathStyle forces path-style addressing (needed by MinIO and some providers).
	UsePathStyle bool
}

// Client is a thin wrapper around the S3 API client.
type Client struct {
	api *s3sdk.Client
	pre *s3sdk.PresignClient
}

// New builds a client from Config.
func New(cfg Config) *Client {
	region := cfg.Region
	if region == "" {
		region = "us-east-1"
	}
	awsCfg := aws.Config{
		Region:      region,
		Credentials: credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, ""),
	}
	opts := func(o *s3sdk.Options) {
		if cfg.Endpoint != "" {
			o.BaseEndpoint = aws.String(cfg.Endpoint)
		}
		o.UsePathStyle = cfg.UsePathStyle
	}
	api := s3sdk.NewFromConfig(awsCfg, opts)
	return &Client{api: api, pre: s3sdk.NewPresignClient(api)}
}

// BucketInfo is a storage bucket.
type BucketInfo struct {
	Name         string `json:"name"`
	CreationDate string `json:"creationDate,omitempty"`
}

// ListBuckets returns all buckets visible to the credentials.
// Returns an error when the key lacks the ListBuckets permission —
// callers should then fall back to a manually entered bucket name.
func (c *Client) ListBuckets(ctx context.Context) ([]BucketInfo, error) {
	out, err := c.api.ListBuckets(ctx, &s3sdk.ListBucketsInput{})
	if err != nil {
		return nil, fmt.Errorf("list buckets: %w", err)
	}
	var res []BucketInfo
	for _, b := range out.Buckets {
		res = append(res, BucketInfo{
			Name:         aws.ToString(b.Name),
			CreationDate: b.CreationDate.Format(time.RFC3339),
		})
	}
	return res, nil
}

// Object is a single stored object (file).
type Object struct {
	Key          string `json:"key"`
	Size         int64  `json:"size"`
	LastModified string `json:"lastModified"`
	ETag         string `json:"etag,omitempty"`
}

// ListObjects lists objects under prefix. delimiter "/" groups "folders".
// Returns objects, common prefixes (folders), and whether more pages exist.
func (c *Client) ListObjects(ctx context.Context, bucket, prefix, contToken string) (
	objects []Object, folders []string, nextToken string, err error) {
	in := &s3sdk.ListObjectsV2Input{
		Bucket:    aws.String(bucket),
		Prefix:    aws.String(prefix),
		Delimiter: aws.String("/"),
		MaxKeys:   aws.Int32(1000),
	}
	if contToken != "" {
		in.ContinuationToken = aws.String(contToken)
	}
	out, err := c.api.ListObjectsV2(ctx, in)
	if err != nil {
		return nil, nil, "", fmt.Errorf("list objects: %w", err)
	}
	for _, o := range out.Contents {
		// Skip the placeholder object for the prefix itself.
		if aws.ToString(o.Key) == prefix {
			continue
		}
		objects = append(objects, Object{
			Key:          aws.ToString(o.Key),
			Size:         aws.ToInt64(o.Size),
			LastModified: o.LastModified.Format(time.RFC3339),
			ETag:         aws.ToString(o.ETag),
		})
	}
	for _, cp := range out.CommonPrefixes {
		folders = append(folders, aws.ToString(cp.Prefix))
	}
	if aws.ToBool(out.IsTruncated) {
		nextToken = aws.ToString(out.NextContinuationToken)
	}
	return objects, folders, nextToken, nil
}

// ObjectPage is one page of a recursive (no delimiter) listing.
type ObjectPage struct {
	Objects   []Object
	NextToken string
}

// ListAllPage lists objects recursively (no delimiter), one page at a time.
// Used by the dashboard to scan the whole bucket.
func (c *Client) ListAllPage(ctx context.Context, bucket, contToken string) (ObjectPage, error) {
	return c.ListPrefixPage(ctx, bucket, "", contToken)
}

// ListPrefixPage lists objects under prefix recursively, one page at a time.
func (c *Client) ListPrefixPage(ctx context.Context, bucket, prefix, contToken string) (ObjectPage, error) {
	in := &s3sdk.ListObjectsV2Input{
		Bucket:  aws.String(bucket),
		MaxKeys: aws.Int32(1000),
	}
	if prefix != "" {
		in.Prefix = aws.String(prefix)
	}
	if contToken != "" {
		in.ContinuationToken = aws.String(contToken)
	}
	out, err := c.api.ListObjectsV2(ctx, in)
	if err != nil {
		return ObjectPage{}, fmt.Errorf("list objects: %w", err)
	}
	var page ObjectPage
	for _, o := range out.Contents {
		page.Objects = append(page.Objects, Object{
			Key:          aws.ToString(o.Key),
			Size:         aws.ToInt64(o.Size),
			LastModified: o.LastModified.Format(time.RFC3339),
			ETag:         aws.ToString(o.ETag),
		})
	}
	if aws.ToBool(out.IsTruncated) {
		page.NextToken = aws.ToString(out.NextContinuationToken)
	}
	return page, nil
}

// HeadBucket checks that a bucket exists and is reachable.
func (c *Client) HeadBucket(ctx context.Context, bucket string) error {
	_, err := c.api.HeadBucket(ctx, &s3sdk.HeadBucketInput{Bucket: aws.String(bucket)})
	return err
}

// PresignDownload returns a time-limited GET URL. The browser downloads
// directly from storage; the secret key never leaves the server.
func (c *Client) PresignDownload(ctx context.Context, bucket, key string, expires time.Duration, asAttachment bool) (string, error) {
	input := &s3sdk.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}
	if asAttachment {
		// Force browser to download instead of previewing inline.
		input.ResponseContentDisposition = aws.String("attachment")
	}
	req, err := c.pre.PresignGetObject(ctx, input, s3sdk.WithPresignExpires(expires))
	if err != nil {
		return "", fmt.Errorf("presign download: %w", err)
	}
	return req.URL, nil
}

// PresignUpload returns a time-limited PUT URL for direct browser upload.
func (c *Client) PresignUpload(ctx context.Context, bucket, key string, expires time.Duration) (string, error) {
	req, err := c.pre.PresignPutObject(ctx, &s3sdk.PutObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, s3sdk.WithPresignExpires(expires))
	if err != nil {
		return "", fmt.Errorf("presign upload: %w", err)
	}
	return req.URL, nil
}

// DeleteObjects removes up to 1000 keys in one call.
func (c *Client) DeleteObjects(ctx context.Context, bucket string, keys []string) error {
	if len(keys) == 0 {
		return nil
	}
	var ids []types.ObjectIdentifier
	for _, k := range keys {
		ids = append(ids, types.ObjectIdentifier{Key: aws.String(k)})
	}
	_, err := c.api.DeleteObjects(ctx, &s3sdk.DeleteObjectsInput{
		Bucket: aws.String(bucket),
		Delete: &types.Delete{Objects: ids},
	})
	if err != nil {
		return fmt.Errorf("delete objects: %w", err)
	}
	return nil
}

// CopyObject copies key within the same bucket (used for rename).
func (c *Client) CopyObject(ctx context.Context, bucket, srcKey, dstKey string) error {
	_, err := c.api.CopyObject(ctx, &s3sdk.CopyObjectInput{
		Bucket:     aws.String(bucket),
		Key:        aws.String(dstKey),
		CopySource: aws.String(bucket + "/" + srcKey),
	})
	if err != nil {
		return fmt.Errorf("copy object: %w", err)
	}
	return nil
}

// CopyObjectCrossBucket copies key from srcBucket to dstBucket (same endpoint/account).
func (c *Client) CopyObjectCrossBucket(ctx context.Context, srcBucket, srcKey, dstBucket, dstKey string) error {
	_, err := c.api.CopyObject(ctx, &s3sdk.CopyObjectInput{
		Bucket:     aws.String(dstBucket),
		Key:        aws.String(dstKey),
		CopySource: aws.String(srcBucket + "/" + srcKey),
	})
	if err != nil {
		return fmt.Errorf("copy object cross-bucket: %w", err)
	}
	return nil
}

// PutEmptyObject creates a zero-byte object (used for "new folder",
// since S3 has no real directories — "folder/" keeps the prefix visible).
func (c *Client) PutEmptyObject(ctx context.Context, bucket, key string) error {
	_, err := c.api.PutObject(ctx, &s3sdk.PutObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("create folder: %w", err)
	}
	return nil
}
