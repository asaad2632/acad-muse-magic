import { i as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-BfzyRf7F.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { g as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-ir1iaXdo.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AuthPage() {
	const navigate = useNavigate();
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
			const hash = window.location.hash;
			window.location.replace("/reset-password" + hash);
			return;
		}
		supabase.auth.getSession().then(({ data }) => {
			if (data.session) navigate({ to: "/" });
		});
	}, [navigate]);
	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password
			});
			if (error) {
				console.error("[auth] signIn error:", error);
				setError("بيانات الدخول غير صحيحة");
				return;
			}
			if (data.session) window.location.href = "/";
			else setError("بيانات الدخول غير صحيحة");
		} catch (err) {
			console.error("[auth] unexpected:", err);
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
					children: "تسجيل الدخول"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					style: {
						display: "block",
						fontSize: 14,
						color: "#334155",
						marginBottom: 4
					},
					children: "البريد الإلكتروني"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "email",
					required: true,
					value: email,
					onChange: (e) => setEmail(e.target.value),
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
					children: "كلمة المرور"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "password",
					required: true,
					minLength: 6,
					value: password,
					onChange: (e) => setPassword(e.target.value),
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
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: loading,
					"data-testid": "auth-submit-btn",
					style: {
						width: "100%",
						padding: "12px",
						background: "#1e3a8a",
						color: "#fff",
						border: 0,
						borderRadius: 8,
						fontSize: 16,
						fontWeight: 600,
						cursor: loading ? "wait" : "pointer",
						fontFamily: "inherit"
					},
					children: loading ? "..." : "دخول"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					style: {
						textAlign: "center",
						color: "#94a3b8",
						fontSize: 12,
						marginTop: 16,
						marginBottom: 0,
						lineHeight: 1.7
					},
					children: [
						"🔒 الوصول مقصور على الباحث والمشرف فقط.",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						"التسجيل الذاتي غير متاح."
					]
				})
			]
		})
	});
}
//#endregion
export { AuthPage as component };
