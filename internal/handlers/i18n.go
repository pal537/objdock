package handlers

import (
	"net/http"
	"strings"
)

// 公开落地页（分享页 / 上传页）的多语言文案。
// 语言按 Accept-Language 判定，默认 zh-CN（保护现有中文用户）。

// jsStr 把文案转成可安全嵌入双引号 JS 字符串的形式
func jsStr(s string) string {
	r := strings.ReplaceAll(s, `\`, `\\`)
	r = strings.ReplaceAll(r, `"`, `\"`)
	r = strings.ReplaceAll(r, "
", `\n`)
	return r
}

func langFromRequest(r *http.Request) string {
	al := strings.ToLower(r.Header.Get("Accept-Language"))
	for _, part := range strings.Split(al, ",") {
		p := strings.TrimSpace(strings.SplitN(part, ";", 2)[0])
		switch {
		case strings.HasPrefix(p, "zh"):
			return "zh-CN"
		case strings.HasPrefix(p, "en"):
			return "en"
		case strings.HasPrefix(p, "ja"):
			return "ja"
		case strings.HasPrefix(p, "ko"):
			return "ko"
		case strings.HasPrefix(p, "es"):
			return "es"
		}
	}
	return "zh-CN"
}

// pageText[lang][key] 公开页文案
var pageText = map[string]map[string]string{
	"zh-CN": {
		"share.title": "分享文件", "share.pageTitle": "ObjDock 分享",
		"share.brandSub": "对象存储分享", "share.download": "⬇ 下载",
		"share.noFiles": "暂无文件", "share.fromUser": "来源于 %s 的分享",
		"upload.title": "上传文件", "upload.pageTitle": "上传文件 - ObjDock",
		"upload.invite": "%s 邀请你上传文件", "upload.noLogin": "无需登录，直接上传到对方的存储空间",
		"upload.dropTitle": "点击选择或拖拽文件到这里", "upload.dropSub": "可多次选择，支持多文件",
		"upload.start": "开始上传", "upload.uploading": "上传中…",
		"upload.okMark": "✅ 完成", "upload.errPresign": "获取上传地址失败", "upload.errNet": "网络错误",
		"upload.needPw": "需要密码", "upload.pwProtected": "此上传链接受密码保护",
		"upload.pwWrong": "密码错误，请重试", "upload.pwPh": "输入密码", "upload.unlock": "解锁",
		"upload.doneOk": "🎉 上传完成！成功 %d 个", "upload.doneFail": "，失败 %d 个",
	},
	"en": {
		"share.title": "Shared Files", "share.pageTitle": "ObjDock Share",
		"share.brandSub": "Object storage sharing", "share.download": "⬇ Download",
		"share.noFiles": "No files", "share.fromUser": "Shared by %s",
		"upload.title": "Upload Files", "upload.pageTitle": "Upload Files - ObjDock",
		"upload.invite": "%s invites you to upload files", "upload.noLogin": "No login needed, upload directly to their storage",
		"upload.dropTitle": "Click to select or drag files here", "upload.dropSub": "Multiple selections supported",
		"upload.start": "Start Upload", "upload.uploading": "Uploading…",
		"upload.okMark": "✅ Done", "upload.errPresign": "Failed to get upload URL", "upload.errNet": "Network error",
		"upload.needPw": "Password Required", "upload.pwProtected": "This upload link is password protected",
		"upload.pwWrong": "Wrong password, try again", "upload.pwPh": "Enter password", "upload.unlock": "Unlock",
		"upload.doneOk": "🎉 Upload complete! %d succeeded", "upload.doneFail": ", %d failed",
	},
	"ja": {
		"share.title": "共有ファイル", "share.pageTitle": "ObjDock 共有",
		"share.brandSub": "オブジェクトストレージ共有", "share.download": "⬇ ダウンロード",
		"share.noFiles": "ファイルなし", "share.fromUser": "%s からの共有",
		"upload.title": "ファイルアップロード", "upload.pageTitle": "アップロード - ObjDock",
		"upload.invite": "%s がアップロードに招待しています", "upload.noLogin": "ログイン不要、直接ストレージにアップロード",
		"upload.dropTitle": "クリックで選択またはドラッグ", "upload.dropSub": "複数選択・複数ファイル対応",
		"upload.start": "アップロード開始", "upload.uploading": "アップロード中…",
		"upload.okMark": "✅ 完了", "upload.errPresign": "アップロードURLの取得に失敗", "upload.errNet": "ネットワークエラー",
		"upload.needPw": "パスワードが必要", "upload.pwProtected": "このリンクはパスワードで保護されています",
		"upload.pwWrong": "パスワードが違います", "upload.pwPh": "パスワードを入力", "upload.unlock": "解除",
		"upload.doneOk": "🎉 完了！成功 %d 件", "upload.doneFail": "、失敗 %d 件",
	},
	"ko": {
		"share.title": "공유 파일", "share.pageTitle": "ObjDock 공유",
		"share.brandSub": "오브젝트 스토리지 공유", "share.download": "⬇ 다운로드",
		"share.noFiles": "파일 없음", "share.fromUser": "%s님의 공유",
		"upload.title": "파일 업로드", "upload.pageTitle": "업로드 - ObjDock",
		"upload.invite": "%s님이 업로드를 초대했습니다", "upload.noLogin": "로그인 없이 직접 스토리지에 업로드",
		"upload.dropTitle": "클릭하여 선택하거나 드래그", "upload.dropSub": "여러 번 선택, 다중 파일 지원",
		"upload.start": "업로드 시작", "upload.uploading": "업로드 중…",
		"upload.okMark": "✅ 완료", "upload.errPresign": "업로드 주소 가져오기 실패", "upload.errNet": "네트워크 오류",
		"upload.needPw": "비밀번호 필요", "upload.pwProtected": "이 링크는 비밀번호로 보호됩니다",
		"upload.pwWrong": "비밀번호가 틀렸습니다", "upload.pwPh": "비밀번호 입력", "upload.unlock": "잠금 해제",
		"upload.doneOk": "🎉 완료! 성공 %d개", "upload.doneFail": ", 실패 %d개",
	},
	"es": {
		"share.title": "Archivos compartidos", "share.pageTitle": "Compartido ObjDock",
		"share.brandSub": "Compartir almacenamiento", "share.download": "⬇ Descargar",
		"share.noFiles": "Sin archivos", "share.fromUser": "Compartido por %s",
		"upload.title": "Subir archivos", "upload.pageTitle": "Subir - ObjDock",
		"upload.invite": "%s te invita a subir archivos", "upload.noLogin": "Sin iniciar sesión, sube directo a su almacenamiento",
		"upload.dropTitle": "Clic para seleccionar o arrastra aquí", "upload.dropSub": "Selección múltiple admitida",
		"upload.start": "Iniciar subida", "upload.uploading": "Subiendo…",
		"upload.okMark": "✅ Listo", "upload.errPresign": "Error al obtener URL de subida", "upload.errNet": "Error de red",
		"upload.needPw": "Se requiere contraseña", "upload.pwProtected": "Este enlace está protegido con contraseña",
		"upload.pwWrong": "Contraseña incorrecta", "upload.pwPh": "Ingrese contraseña", "upload.unlock": "Desbloquear",
		"upload.doneOk": "🎉 ¡Completado! %d correctos", "upload.doneFail": ", %d fallidos",
	},
}

// ptr 返回指定语言的文案（缺失回退中文）
func ptr(lang, key string) string {
	if m, ok := pageText[lang]; ok {
		if v, ok := m[key]; ok {
			return v
		}
	}
	return pageText["zh-CN"][key]
}
