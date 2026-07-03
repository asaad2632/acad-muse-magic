// Programmatic verification that archiveRef + sourceType are both editable
// in the "manual edit" panel AND rendered as text inside the thesis-structure
// source rows (both the section-linked list and the unclassified list).
//
// Not a UI test — this is a static AST/text audit of App.jsx to guarantee the
// wiring is correct without opening a browser.

import fs from "node:fs";

const src = fs.readFileSync("/app/src/App.jsx", "utf-8");
const fail = (msg) => { console.error("❌ " + msg); process.exit(1); };
const pass = (msg) => console.log("✅ " + msg);

// ---- Part A: manual edit panel -------------------------------------------
// The two new inputs live under a common testid pattern.
const editArchiveRe = /data-testid=\{`lib-edit-archive-ref-\$\{src\.id\}`\}[\s\S]{0,600}?onChange=\{e=>updateLibSrc\(src\.id,\{archiveRef:e\.target\.value\}\)\}/;
if (!editArchiveRe.test(src)) fail("lib-edit-archive-ref input not wired to updateLibSrc(archiveRef)");
pass("Edit panel: archiveRef input present and writes to src.archiveRef");

const editRefReads = /value=\{src\.archiveRef\|\|""\}/;
if (!editRefReads.test(src)) fail("archiveRef input does not read from src.archiveRef");
pass("Edit panel: archiveRef input reads from src.archiveRef");

const editSrcTypeRe = /data-testid=\{`lib-edit-source-type-\$\{src\.id\}`\}[\s\S]{0,600}?onChange=\{e=>updateLibSrc\(src\.id,\{sourceType:e\.target\.value\}\)\}/;
if (!editSrcTypeRe.test(src)) fail("lib-edit-source-type input not wired to updateLibSrc(sourceType)");
pass("Edit panel: sourceType input present and writes to src.sourceType");

const editSrcTypeReads = /value=\{src\.sourceType\|\|""\}/;
if (!editSrcTypeReads.test(src)) fail("sourceType input does not read from src.sourceType");
pass("Edit panel: sourceType input reads from src.sourceType");

// Both new fields must appear AFTER the "الصفحات المهمة" grid cell.
const impPagesIdx = src.indexOf("الصفحات المهمة</label>");
const archiveEditIdx = src.indexOf("lib-edit-archive-ref-");
const srcTypeEditIdx = src.indexOf("lib-edit-source-type-");
if (!(impPagesIdx < archiveEditIdx && archiveEditIdx < srcTypeEditIdx)) {
  fail("Order wrong: expected 'الصفحات المهمة' → archiveRef input → sourceType input");
}
pass("Edit panel: fields appear directly below 'الصفحات المهمة' in the correct order");

// The old <select> for sourceType must be gone (else we have two fields).
const oldSelectRe = /<select value=\{src\.sourceType\|\|""\}/;
if (oldSelectRe.test(src)) fail("Old <select> for sourceType still present — would duplicate the field");
pass("Edit panel: old <select> for sourceType removed (no duplication)");

// ---- Part B: thesis-structure source rows --------------------------------
// Section-linked list: must show both archiveRef and sourceType/category.
const structArchive = /data-testid=\{`struct-doc-archive-ref-\$\{d\.id\}`\}[\s\S]{0,200}?\{d\.archiveRef\}/;
if (!structArchive.test(src)) fail("Structure page: section-linked row does not render d.archiveRef as text");
pass("Structure: section-linked row renders d.archiveRef as text");

const structSrcType = /data-testid=\{`struct-doc-source-type-\$\{d\.id\}`\}[\s\S]{0,200}?\{d\.sourceType\|\|d\.category\}/;
if (!structSrcType.test(src)) fail("Structure page: section-linked row does not render d.sourceType||d.category as text");
pass("Structure: section-linked row renders d.sourceType||d.category as text");

// Unclassified (chapter-level) list: same guarantees.
const unclArchive = /data-testid=\{`struct-unclassified-archive-ref-\$\{d\.id\}`\}[\s\S]{0,200}?\{d\.archiveRef\}/;
if (!unclArchive.test(src)) fail("Structure page: unclassified row does not render d.archiveRef as text");
pass("Structure: unclassified row renders d.archiveRef as text");

const unclSrcType = /data-testid=\{`struct-unclassified-source-type-\$\{d\.id\}`\}[\s\S]{0,200}?\{d\.sourceType\|\|d\.category\}/;
if (!unclSrcType.test(src)) fail("Structure page: unclassified row does not render d.sourceType||d.category as text");
pass("Structure: unclassified row renders d.sourceType||d.category as text");

// ---- Part C: library → doc bridge must expose sourceType -----------------
// combinedDocs is what feeds the structure page. libAsDocs must set both
// `sourceType` and `category` from the library entry so the structure rows
// pick up the value even if only one field is stored on the library source.
const bridgeSrcType = /sourceType: s\.sourceType \|\| s\.category \|\| ""/;
if (!bridgeSrcType.test(src)) fail("libAsDocs bridge does not carry sourceType through to the docs shape");
pass("Bridge: libAsDocs sets d.sourceType from s.sourceType / s.category");

const bridgeCategory = /category: s\.sourceType \|\| s\.category \|\| ""/;
if (!bridgeCategory.test(src)) fail("libAsDocs bridge does not carry category through to the docs shape");
pass("Bridge: libAsDocs sets d.category from s.sourceType / s.category");

console.log("\n✅ All checks passed. archiveRef + sourceType are wired end-to-end.");
