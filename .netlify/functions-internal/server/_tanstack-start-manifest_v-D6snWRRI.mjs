//#region node_modules/.nitro/vite/services/ssr/assets/_tanstack-start-manifest_v-D6snWRRI.js
var tsrStartManifest = () => ({ routes: {
	__root__: {
		filePath: "/app/src/routes/__root.tsx",
		children: [
			"/_authenticated",
			"/auth",
			"/reset-password",
			"/api/ai-chat"
		],
		preloads: ["/assets/index-CvIj1DR8.js", "/assets/jsx-runtime-B9A3Oc0h.js"],
		scripts: [{ attrs: {
			type: "module",
			async: !0,
			src: "/assets/index-CvIj1DR8.js"
		} }]
	},
	"/_authenticated": {
		filePath: "/app/src/routes/_authenticated/route.tsx",
		children: ["/_authenticated/"],
		preloads: ["/assets/route-BJJ0xIsl.js"]
	},
	"/auth": {
		filePath: "/app/src/routes/auth.tsx",
		children: void 0,
		preloads: ["/assets/auth-CVS5bv4Z.js"]
	},
	"/reset-password": {
		filePath: "/app/src/routes/reset-password.tsx",
		children: void 0,
		preloads: ["/assets/reset-password-C07gxdjL.js"]
	},
	"/_authenticated/": {
		filePath: "/app/src/routes/_authenticated/index.tsx",
		children: void 0,
		preloads: ["/assets/_authenticated-BT1ZBXA5.js"]
	}
} });
//#endregion
export { tsrStartManifest };
