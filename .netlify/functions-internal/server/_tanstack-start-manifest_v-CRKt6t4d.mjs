//#region node_modules/.nitro/vite/services/ssr/assets/_tanstack-start-manifest_v-CRKt6t4d.js
var tsrStartManifest = () => ({ routes: {
	__root__: {
		filePath: "/app/src/routes/__root.tsx",
		children: [
			"/_authenticated",
			"/auth",
			"/reset-password",
			"/api/ai-chat"
		],
		preloads: ["/assets/index-hEWQeLrD.js", "/assets/jsx-runtime-B9A3Oc0h.js"],
		scripts: [{ attrs: {
			type: "module",
			async: !0,
			src: "/assets/index-hEWQeLrD.js"
		} }]
	},
	"/_authenticated": {
		filePath: "/app/src/routes/_authenticated/route.tsx",
		children: ["/_authenticated/"],
		preloads: ["/assets/route-Cd6Cm1zF.js"]
	},
	"/auth": {
		filePath: "/app/src/routes/auth.tsx",
		children: void 0,
		preloads: ["/assets/auth-BirR8Q0x.js"]
	},
	"/reset-password": {
		filePath: "/app/src/routes/reset-password.tsx",
		children: void 0,
		preloads: ["/assets/reset-password-DWlikxU5.js"]
	},
	"/_authenticated/": {
		filePath: "/app/src/routes/_authenticated/index.tsx",
		children: void 0,
		preloads: ["/assets/_authenticated-BetrpG9c.js"]
	}
} });
//#endregion
export { tsrStartManifest };
