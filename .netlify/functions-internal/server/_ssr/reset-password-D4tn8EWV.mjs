import { i as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-BfzyRf7F.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { g as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reset-password-D4tn8EWV.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ResetPasswordPage() {
	const navigate = useNavigate();
	const [password, setPassword] = (0, import_react.useState)("");
	const [confirmPassword, setConfirmPassword] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [success, setSuccess] = (0, import_react.useState)(null);
	const [sessionReady, setSessionReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const hash = window.location.hash.startsWith("#") ? window.location.hash.substring(1) : window.location.hash;
		const params = new URLSearchParams(hash);
		const accessToken = params.get("access_token");
		const refreshToken = params.get("refresh_token");
		const type = params.get("type");
		if (accessToken && refreshToken && type === "recovery") supabase.auth.setSession({
			access_token: accessToken,
			refresh_token: refreshToken
		}).then(({ error }) => {
			if (error) {
				console.error("[reset-password] setSession error:", error);
				setError("رابط استعادة كلمة المرور غير صالح أو منتهي الصلاحية");
			} else {
				setSessionReady(true);
				window.history.replaceState(null, "", window.location.pathname);
			}
		});
		else supabase.auth.getSession().then(({ data }) => {
			if (data.session) setSessionReady(true);
			else setError("رابط استعادة كلمة المرور غير صالح أو منتهي الصلاحية");
		});
	}, []);
	async function handleSubmit(e) {
		e.preventDefault();
		setError(null);
		setSuccess(null);
		if (password.length < 6) {
			setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
			return;
		}
		if (password !== confirmPassword) {
			setError("كلمة المرور وتأكيدها غير متطابقين");
			return;
		}
		setLoading(true);
		try {
			const { error } = await supabase.auth.updateUser({ password });
			if (error) {
				console.error("[reset-password] updateUser error:", error);
				setError("تعذر تحديث كلمة المرور: " + (error.message || "خطأ غير معروف"));
				return;
			}
			setSuccess("تم تحديث كلمة المرور بنجاح. جاري تحويلك إلى صفحة الدخول...");
			setTimeout(async () => {
				await supabase.auth.signOut();
				navigate({ to: "/auth" });
			}, 2e3);
		} catch (err) {
			console.error("[reset-password] unexpected:", err);
			setError("حدث خطأ غير متوقع");
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		dir: "rtl",
		style: {
			minHeight: "100vh",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			background: "linear-gradient(135deg,#0f172a,#1e3a8a)",
			fontFamily: "Cairo, sans-serif",
			padding: 16
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: handleSubmit,
			style: {
				background: "#fff",
				padding: 32,
				borderRadius: 16,
				width: "100%",
				maxWidth: 420,
				boxShadow: "0 20px 60px rgba(0,0,0,.3)"
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					style: {
						margin: 0,
						fontSize: 24,
						color: "#0f172a",
						textAlign: "center"
					},
					children: "📚 الأرشيف الأكاديمي"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					style: {
						textAlign: "center",
						color: "#64748b",
						marginTop: 6,
						marginBottom: 24
					},
					children: "إعادة تعيين كلمة المرور"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					style: {
						display: "block",
						fontSize: 14,
						color: "#334155",
						marginBottom: 4
					},
					children: "كلمة المرور الجديدة"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "password",
					required: true,
					minLength: 6,
					value: password,
					onChange: (e) => setPassword(e.target.value),
					disabled: !sessionReady || loading || !!success,
					"data-testid": "reset-password-input",
					style: {
						width: "100%",
						padding: "10px 12px",
						borderRadius: 8,
						border: "1px solid #cbd5e1",
						marginBottom: 16,
						fontFamily: "inherit",
						fontSize: 15
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					style: {
						display: "block",
						fontSize: 14,
						color: "#334155",
						marginBottom: 4
					},
					children: "تأكيد كلمة المرور"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "password",
					required: true,
					minLength: 6,
					value: confirmPassword,
					onChange: (e) => setConfirmPassword(e.target.value),
					disabled: !sessionReady || loading || !!success,
					"data-testid": "reset-password-confirm-input",
					style: {
						width: "100%",
						padding: "10px 12px",
						borderRadius: 8,
						border: "1px solid #cbd5e1",
						marginBottom: 16,
						fontFamily: "inherit",
						fontSize: 15
					}
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					"data-testid": "reset-password-error",
					style: {
						background: "#fef2f2",
						color: "#991b1b",
						padding: "8px 12px",
						borderRadius: 8,
						fontSize: 14,
						marginBottom: 12
					},
					children: error
				}),
				success && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					"data-testid": "reset-password-success",
					style: {
						background: "#f0fdf4",
						color: "#166534",
						padding: "8px 12px",
						borderRadius: 8,
						fontSize: 14,
						marginBottom: 12
					},
					children: success
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: !sessionReady || loading || !!success,
					"data-testid": "reset-password-submit-btn",
					style: {
						width: "100%",
						padding: "12px",
						background: "#1e3a8a",
						color: "#fff",
						border: 0,
						borderRadius: 8,
						fontSize: 16,
						fontWeight: 600,
						cursor: !sessionReady || loading || !!success ? "not-allowed" : "pointer",
						fontFamily: "inherit",
						opacity: !sessionReady || loading || !!success ? .7 : 1
					},
					children: loading ? "..." : "حفظ"
				})
			]
		})
	});
}
//#endregion
export { ResetPasswordPage as component };
