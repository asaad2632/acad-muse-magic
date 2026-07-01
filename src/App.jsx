import React, { useState, useEffect, useCallback, useRef } from "react";
import { AI_MODELS, getSelectedModel, setSelectedModel } from "./config";
import { callLLM, analyzeDocumentLLM } from "./aiClient";
import mammoth from "mammoth";
import SupervisorRoom from "./SupervisorRoom";
import NotificationBell from "./NotificationBell";
import { loadPhase3a, syncChapters, syncUserDocs, syncDeletedBaseDocs, debounce, loadLibrary, syncLibrary, uploadLibraryFile, getLibraryFileUrl, deleteLibraryFile, insertLibraryRow, updateLibraryRow, deleteLibraryRow, loadBibliography, syncBibliography, loadCards, syncCards, loadTranslations, syncTranslations, loadCustomFormats, syncCustomFormats, getMyRole } from "./cloudSync";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// بيانات الفصول والمباحث — مستخرجة من خطة السمنار
// الخليج العربي في سنوات الحرب العالمية الثانية 1939-1945
// ============================================================
const CHAPTERS_DATA = [
  {
    id: 1,
    titleAr: "الفصل الأول: أوضاع منطقة الخليج العربي عشية الحرب العالمية الثانية (1918-1939)",
    color: "#3B82F6",
    sections: [
      { id:"1-1", title:"م1: الموقع الجغرافي وممرات التجارة العالمية في منطقة الخليج العربي" },
      { id:"1-2", title:"م2: بنية الإمارات ومشيخات الخليج العربي السياسية حتى عام 1939" },
      { id:"1-3", title:"م3: مظاهر التنافس الدولي في الخليج العربي قبيل اندلاع الحرب العالمية الثانية" },
      { id:"1-4", title:"م4: الأوضاع الاقتصادية وبداية التغير الاقتصادي قبل اكتشاف النفط واستغلاله" },
    ]
  },
  {
    id: 2,
    titleAr: "الفصل الثاني: أهمية منطقة الخليج العربي الاستراتيجية والعسكرية إبان الحرب العالمية الثانية",
    color: "#8B5CF6",
    sections: [
      { id:"2-1", title:"م1: موقع الخليج العربي الاستراتيجي في خطط الحلفاء العسكرية" },
      { id:"2-1a", title:"   ↳ إنشاء وتطوير القواعد البريطانية والأمريكية الجوية والبحرية" },
      { id:"2-1b", title:"   ↳ الأدوار العسكرية للقواعد في حماية طرق النفط والإمدادات" },
      { id:"2-1c", title:"   ↳ التنسيق العسكري بين بريطانيا والولايات المتحدة في الخليج" },
      { id:"2-2", title:"م2: القواعد العسكرية وموانئ الخليج ودورها في العمليات الحربية" },
      { id:"2-2a", title:"   ↳ دور موانئ البحرين والكويت ومسقط في دعم الحلفاء" },
      { id:"2-2b", title:"   ↳ استخدام الطرق البحرية لنقل النفط والعتاد العسكري" },
      { id:"2-2c", title:"   ↳ الأمن البحري ومواجهة التهديدات الألمانية واليابانية في المحيط الهندي" },
      { id:"2-3", title:"م3: السيادة والسيطرة البحرية والأمن العسكري في الخليج إبان الحرب" },
      { id:"2-3a", title:"   ↳ تعزيز السيطرة البحرية البريطانية في الخليج العربي" },
      { id:"2-3b", title:"   ↳ أهمية الخليج في تأمين طرق الملاحة وخطوط الإمداد العسكرية" },
      { id:"2-3c", title:"   ↳ الإجراءات الأمنية والعسكرية لحماية المصالح الاستراتيجية" },
    ]
  },
  {
    id: 3,
    titleAr: "الفصل الثالث: أثر الحرب العالمية الثانية على الأوضاع السياسية في منطقة الخليج",
    color: "#10B981",
    sections: [
      { id:"3-1", title:"م1: التغيرات السياسية والإدارية في إمارات الخليج إبان الحرب" },
      { id:"3-1a", title:"   ↳ سياسة الحياد وميل بعض الأطراف الخليجية نحو الحلفاء" },
      { id:"3-1b", title:"   ↳ العلاقات الدبلوماسية مع بريطانيا والولايات المتحدة" },
      { id:"3-1c", title:"   ↳ الدور السياسي للملك عبد العزيز آل سعود في التوازن الإقليمي" },
      { id:"3-2", title:"م2: تأثير الحرب على الوعي السياسي وبداية التحولات الحديثة في الخليج" },
      { id:"3-2a", title:"   ↳ تنامي الوعي السياسي في مجتمعات الخليج خلال سنوات الحرب" },
      { id:"3-2b", title:"   ↳ تأثير المتغيرات الاقتصادية في بروز بوادر التحول الحديث" },
      { id:"3-2c", title:"   ↳ بداية تشكّل علاقات سياسية وإدارية جديدة مهّدت لمرحلة التحديث" },
      { id:"3-3", title:"م3: أثر الحرب على العلاقات الخليجية مع دول الحرب (الحلفاء والمحور)" },
      { id:"3-3a", title:"   ↳ طبيعة العلاقة مع القوى الكبرى أثناء الحرب" },
      { id:"3-3b", title:"   ↳ محاولات دول المحور اختراق النفوذ البريطاني في المنطقة" },
      { id:"3-3c", title:"   ↳ تعزيز النفوذ البريطاني والأمريكي بعد عام 1943م" },
    ]
  },
  {
    id: 4,
    titleAr: "الفصل الرابع: التحولات الاقتصادية في الخليج إبان الحرب العالمية الثانية",
    color: "#F59E0B",
    sections: [
      { id:"4-1", title:"م1: أثر الحرب العالمية الثانية في التجارة والملاحة في الخليج" },
      { id:"4-1a", title:"   ↳ تأثير الحرب في حركة التجارة البحرية في الخليج العربي" },
      { id:"4-1b", title:"   ↳ التغيرات التي طرأت على الملاحة وطرق النقل البحري" },
      { id:"4-1c", title:"   ↳ انعكاسات ظروف الحرب في الموانئ والأسواق التجارية" },
      { id:"4-2", title:"م2: النفط في الخليج ودوره في الاستراتيجية الاقتصادية للحلفاء" },
      { id:"4-2a", title:"   ↳ بدايات التنقيب عن النفط في السعودية والبحرين والكويت" },
      { id:"4-2b", title:"   ↳ الشركات الأجنبية والامتيازات النفطية في ظل الحرب" },
      { id:"4-2c", title:"   ↳ النفط كمورد استراتيجي رئيسي للحلفاء أثناء الحرب" },
      { id:"4-3", title:"م3: انعكاسات الحرب على البنية الاقتصادية المحلية في مجتمعات الخليج" },
      { id:"4-3a", title:"   ↳ التغير في حركة التجارة الإقليمية بسبب الحرب" },
      { id:"4-3b", title:"   ↳ تأثير الحصار البحري وارتفاع الطلب العالمي على النفط" },
      { id:"4-3c", title:"   ↳ نشوء البنية التحتية الاقتصادية الحديثة بعد انتهاء الحرب" },
    ]
  },
];

// خريطة المبحث ← الفصل للبحث السريع
const SECTION_MAP = {};
CHAPTERS_DATA.forEach(ch => ch.sections.forEach(s => { SECTION_MAP[s.id] = { chapterId: ch.id, sectionTitle: s.title }; }));

// قائمة المباحث الرئيسية فقط (بدون التفريعات) للقوائم المنسدلة
const MAIN_SECTIONS = CHAPTERS_DATA.flatMap(ch =>
  ch.sections.filter(s => !s.id.includes("a") && !s.id.includes("b") && !s.id.includes("c"))
);

const DOCS_FROM_INDEX = [
  // ========== الفصل الأول ==========
  { id:1,  title:"دليل الخليج، مجلد II، الخصائص الجغرافية والإحصائية (لوريمر 1908)", archiveRef:"IOR/L/PS/20/C91/4", chapterId:1, sectionId:"1-1", section:"م1: الموقع الجغرافي وممرات التجارة العالمية", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"المرجع الجغرافي الأهم للخليج قبل الحرب — لا غنى عنه لوصف الموقع" },
  { id:2,  title:"مجموعة المعاهدات والالتزامات، المجلد 11 (الخليج ومسقط)", archiveRef:"IOR/L/PS/20/G3/12", chapterId:1, sectionId:"1-2", section:"م2: بنية الإمارات ومشيخات الخليج السياسية حتى 1939", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"نصوص المعاهدات المؤسِّسة: السلم البحري 1853، الأنجلو-قطرية 1916" },
  { id:3,  title:"مذكرة ملخص معاهدات الخليج (جيبسون ومونتيث، بطلب ابن سعود)", archiveRef:"IOR/L/PS/18/B387", chapterId:1, sectionId:"1-2", section:"م2: بنية الإمارات ومشيخات الخليج السياسية حتى 1939", priority:"★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"ملخص نظام المعاهدات 1926-1927 — خلفية للبنية السياسية عشية الحرب" },
  // ========== الفصل الثاني ==========
  { id:4,  title:"مسؤول الدفاع، الخليج الفارسي. قائد المحطة بالبحرين", archiveRef:"IOR/R/15/2/656", chapterId:2, sectionId:"2-1", section:"م1: الموقع الاستراتيجي في خطط الحلفاء العسكرية — إنشاء وتطوير القواعد", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"إنشاء وتطوير القواعد البريطانية" },
  { id:5,  title:"الدفاع ضد قوات المظلات وإعاقة المطارات", archiveRef:"IOR/R/15/2/659", chapterId:2, sectionId:"2-1", section:"م1: الموقع الاستراتيجي — الأدوار العسكرية للقواعد", priority:"★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"" },
  { id:6,  title:"زيارة طائرات معادية للبحرين 28/1 P", archiveRef:"IOR/R/15/2/669", chapterId:2, sectionId:"2-1", section:"م1: الموقع الاستراتيجي — الأدوار العسكرية للقواعد", priority:"★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"" },
  { id:7,  title:"سياسة دفاع للخليج 28/75 (مذكرة فاول 1938: حقول النفط من الكويت إلى مسقط)", archiveRef:"IOR/R/15/2/762", chapterId:2, sectionId:"2-1", section:"م1: الموقع الاستراتيجي — التنسيق العسكري بريطانيا-أمريكا", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"التنسيق العسكري — يشمل كل الخليج من الكويت لمسقط" },
  { id:8,  title:"العلاقات الأنجلو-أمريكية (سياسة) 28/51", archiveRef:"IOR/R/15/2/743", chapterId:2, sectionId:"2-1", section:"م1: الموقع الاستراتيجي — التنسيق العسكري بريطانيا-أمريكا", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"التنسيق السياسي والعسكري الأنجلو-أمريكي في الخليج" },
  { id:9,  title:"الملف 7 (سلاح الجو الملكي RAF) - مجموعة كاملة IOR/R/15/2/259-293", archiveRef:"IOR/R/15/2/259-293", chapterId:2, sectionId:"2-1", section:"م1: الموقع الاستراتيجي — إنشاء وتطوير القواعد الجوية والبحرية", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"كنز للفصل الثاني — مجموعة RAF الكاملة في البحرين" },
  { id:10, title:"الملف 7/5 اقتراح إنشاء قاعدة RAF في البحرين", archiveRef:"IOR/R/15/2/271", chapterId:2, sectionId:"2-1", section:"م1: الموقع الاستراتيجي — إنشاء وتطوير القواعد الجوية والبحرية", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"" },
  { id:11, title:"استبدال وحدة طائرات مائية بوحدة برية في البحرين (إعفاء RAF الجمركي)", archiveRef:"IOR/L/PS/12/1998", chapterId:2, sectionId:"2-1", section:"م1: الموقع الاستراتيجي — إنشاء وتطوير القواعد الجوية والبحرية", priority:"★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"" },
  { id:12, title:"خريطة أراضي RAF في المحرّق بالبحرين", archiveRef:"IOR/R/15/2/262", chapterId:2, sectionId:"2-1", section:"م1: الموقع الاستراتيجي — إنشاء وتطوير القواعد الجوية والبحرية", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"تطوير قاعدة المحرّق الجوية — وثيقة خرائطية نادرة" },
  { id:13, title:"ملف 7/10 حوادث طائرات سلاح الجو الملكي", archiveRef:"IOR/R/15/2/275", chapterId:2, sectionId:"2-2", section:"م2: القواعد العسكرية وموانئ الخليج — الأمن الجوي والعمليات", priority:"★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"" },
  { id:14, title:"ملف 7/11 رحلات طائرات مجهولة الهوية", archiveRef:"IOR/R/15/2/276", chapterId:2, sectionId:"2-2", section:"م2: القواعد العسكرية وموانئ الخليج — الأمن البحري ومواجهة التهديدات", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"مواجهة التهديدات الألمانية واليابانية" },
  { id:15, title:"ملف 8/16 ملخصات استخباراتية بشأن البحرين 1943-44", archiveRef:"IOR/R/15/2 (8/16)", chapterId:2, sectionId:"2-2", section:"م2: القواعد العسكرية وموانئ الخليج — الأمن البحري ومواجهة التهديدات", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"" },
  { id:16, title:"ملف 28/17-B الإجراءات عند دخول اليابان الحرب", archiveRef:"IOR/R/15/2/706", chapterId:2, sectionId:"2-2", section:"م2: القواعد العسكرية وموانئ الخليج — الأمن البحري / التهديد الياباني", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"مواجهة التهديد الياباني في المحيط الهندي" },
  { id:17, title:"مرافق تخزين نفط للجيش الأمريكي في المحرّق 28/74", archiveRef:"IOR/R/15/2/761", chapterId:2, sectionId:"2-2", section:"م2: القواعد العسكرية وموانئ الخليج — دور موانئ البحرين في دعم الحلفاء", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"دور موانئ البحرين في دعم الحلفاء" },
  { id:18, title:"مراقب بحري أمريكي في البحرين 28/23", archiveRef:"IOR/R/15/2/715", chapterId:2, sectionId:"2-2", section:"م2: القواعد العسكرية وموانئ الخليج — الأمن البحري ومواجهة التهديدات", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"" },
  { id:19, title:"تشريعات طوارئ الحرب 28/34-(i)", archiveRef:"IOR/R/15/2/726", chapterId:2, sectionId:"2-3", section:"م3: السيادة والسيطرة البحرية — تعزيز السيطرة البريطانية", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"تعزيز السيطرة البحرية البريطانية في الخليج" },
  { id:20, title:"تشريعات طوارئ الحرب 28/34-II", archiveRef:"IOR/R/15/2/727", chapterId:2, sectionId:"2-3", section:"م3: السيادة والسيطرة البحرية — تعزيز السيطرة البريطانية", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"" },
  { id:21, title:"إجراءات الدفاع في الخليج - البحرين 28/16 I", archiveRef:"IOR/R/15/2/703", chapterId:2, sectionId:"2-3", section:"م3: السيادة والسيطرة البحرية — تأمين طرق الملاحة وخطوط الإمداد", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"تأمين طرق الملاحة وخطوط الإمداد العسكرية" },
  // ========== الفصل الثالث ==========
  { id:22, title:"الحرب: البروباغندا: الرأي المحلي I", archiveRef:"IOR/R/15/2/687", chapterId:3, sectionId:"3-2", section:"م2: تأثير الحرب على الوعي السياسي — تنامي الوعي السياسي", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"تنامي الوعي السياسي في مجتمعات الخليج" },
  { id:23, title:"الحرب: البروباغندا - الرأي المحلي II", archiveRef:"IOR/R/15/2/688", chapterId:3, sectionId:"3-2", section:"م2: تأثير الحرب على الوعي السياسي — تنامي الوعي السياسي", priority:"★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"" },
  { id:24, title:"ملف 1/A/50 الدعاية والنشر (البروباغندا البريطانية)", archiveRef:"IOR/R/15/2 (1/A/50)", chapterId:3, sectionId:"3-2", section:"م2: تأثير الحرب على الوعي السياسي — البروباغندا وصحيفة البحرين", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"البروباغندا البريطانية وأثرها في الوعي السياسي المحلي" },
  { id:25, title:"ملف 46/11 الدعاية في الخليج الفارسي", archiveRef:"IOR/R/15/6/397", chapterId:3, sectionId:"3-2", section:"م2: تأثير الحرب على الوعي السياسي — البروباغندا (مجلات العرب والنفير)", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"مجلات البروباغندا البريطانية (العرب، النفير) في الخليج" },
  { id:26, title:"أنشطة عبد الله بن فارس (سكرتير شيخ الشارقة)", archiveRef:"IOR/R/15/2/694", chapterId:3, sectionId:"3-3", section:"م3: العلاقات الخليجية مع دول الحرب — محاولات المحور اختراق النفوذ البريطاني", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"البروباغندا النازية في الشارقة — اختراق المحور للنفوذ البريطاني" },
  { id:27, title:"الحرب: سانت جون فيلبي", archiveRef:"IOR/R/15/2/696", chapterId:3, sectionId:"3-3", section:"م3: العلاقات الخليجية مع دول الحرب — محاولات المحور اختراق النفوذ البريطاني", priority:"★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"اختراق المحور للنفوذ البريطاني عبر الوسطاء" },
  { id:28, title:"اضطرابات في العراق 28/27", archiveRef:"IOR/R/15/2/717", chapterId:3, sectionId:"3-3", section:"م3: العلاقات الخليجية مع دول الحرب — طبيعة العلاقة مع القوى الكبرى", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"الانعكاسات الإقليمية على دول الخليج" },
  { id:29, title:"الحرب: الأعمال العدائية في إيران 28/30", archiveRef:"IOR/R/15/2/722", chapterId:3, sectionId:"3-3", section:"م3: العلاقات الخليجية مع دول الحرب — طبيعة العلاقة مع القوى الكبرى", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"" },
  { id:30, title:"مسودة رد تشامبرلين على ابن سعود 1939", archiveRef:"IOR/L/PS/12/2088", chapterId:3, sectionId:"3-1", section:"م1: التغيرات السياسية والإدارية — العلاقات الدبلوماسية مع بريطانيا", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"العلاقات الدبلوماسية مع بريطانيا" },
  { id:31, title:"رسالة بولارد: قلق بريطانيا من وفاة ابن سعود 1938", archiveRef:"IOR/L/PS/12/2082", chapterId:3, sectionId:"3-1", section:"م1: التغيرات السياسية والإدارية — الدور السياسي للملك عبد العزيز في التوازن الإقليمي", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"الدور السياسي للملك عبد العزيز في التوازن الإقليمي" },
  { id:32, title:"مذكرة إشعيا برلين عن خطط أمريكا في السعودية 1944", archiveRef:"IOR/L/PS/12/2124", chapterId:3, sectionId:"3-3", section:"م3: العلاقات الخليجية مع دول الحرب — تعزيز النفوذ الأمريكي بعد 1943", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"تعزيز النفوذ الأمريكي بعد 1943م" },
  { id:33, title:"موارد البحرين المالية (ملصقات دعاية بالعربية على ظهرها)", archiveRef:"IOR/R/15/2 (مالي)", chapterId:3, sectionId:"3-2", section:"م2: تأثير الحرب على الوعي السياسي — ملصقات الدعاية البريطانية بالعربية", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"ملصقات الدعاية البريطانية بالعربية — أثرها في الوعي السياسي" },
  // ========== الفصل الرابع ==========
  { id:34, title:"تمديد نظام ترخيص التصدير I 28/5(أ)", archiveRef:"IOR/R/15/2/684", chapterId:4, sectionId:"4-1", section:"م1: أثر الحرب في التجارة والملاحة — انعكاسات الحرب في الموانئ والأسواق", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"انعكاسات الحرب في الموانئ والأسواق التجارية" },
  { id:35, title:"نظام تراخيص التصدير II (بيانات شهرية)", archiveRef:"IOR/R/15/2/685", chapterId:4, sectionId:"4-1", section:"م1: أثر الحرب في التجارة والملاحة — انعكاسات الحرب في الموانئ والأسواق", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"بيانات شهرية عن حركة التجارة البحرية" },
  { id:36, title:"وضع المخزون في البحرين والساحل المتصالح 29/20", archiveRef:"IOR/R/15/2/773", chapterId:4, sectionId:"4-3", section:"م3: انعكاسات الحرب على البنية الاقتصادية — الحصار البحري وارتفاع الطلب", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"الحصار البحري وارتفاع الطلب العالمي على النفط" },
  { id:37, title:"تخريب آبار النفط 28/1 J", archiveRef:"IOR/R/15/2/660", chapterId:4, sectionId:"4-2", section:"م2: النفط في الخليج — النفط كمورد استراتيجي رئيسي للحلفاء", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"النفط كمورد استراتيجي — خطط التخريب لمنع وقوعه بيد العدو" },
  { id:38, title:"دفاع حقل النفط ومصفاة التكرير 28/1 K I", archiveRef:"IOR/R/15/2/661", chapterId:4, sectionId:"4-2", section:"م2: النفط في الخليج — النفط كمورد استراتيجي رئيسي للحلفاء", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"" },
  { id:39, title:"برنامج الإنكار في قطر 28/35", archiveRef:"IOR/R/15/2/729", chapterId:4, sectionId:"4-2", section:"م2: النفط في الخليج — النفط كمورد استراتيجي (قطر)", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"النفط كمورد استراتيجي في قطر" },
  { id:40, title:"نفط البحرين 28/1 N I", archiveRef:"IOR/R/15/2/666", chapterId:4, sectionId:"4-2", section:"م2: النفط في الخليج — بدايات التنقيب في السعودية والبحرين والكويت", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"بدايات التنقيب عن النفط في البحرين" },
  { id:41, title:"نفط البحرين - أرقام الإنتاج 28/1 N II", archiveRef:"IOR/R/15/2/667", chapterId:4, sectionId:"4-2", section:"م2: النفط في الخليج — النفط كمورد استراتيجي رئيسي للحلفاء", priority:"★★★", category:"مصدر أولي", isNew:false, status:"لم يُراجع", notes:"أرقام إنتاج النفط خلال الحرب" },
  { id:42, title:"الملف 38/3 امتياز نفط قطر", archiveRef:"IOR/R/15/2/864", chapterId:4, sectionId:"4-2", section:"م2: النفط في الخليج — الشركات الأجنبية والامتيازات النفطية في ظل الحرب", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"الامتيازات النفطية في قطر" },
  { id:43, title:"النفط وعلاقته بالشرق الأوسط (مج64) - الكويت", archiveRef:"IOR/R/15/2 (31/86)", chapterId:4, sectionId:"4-2", section:"م2: النفط في الخليج — بدايات التنقيب في السعودية والبحرين والكويت", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"النفط في الكويت وأرامكو وخط التابلاين" },
  { id:44, title:"الدفاع عن الخليج الفارسي - قطر (نفط قطر إمدادات وقود الإمبراطورية + خريطة آبار 1939)", archiveRef:"IOR/L/PS/12/3936", chapterId:4, sectionId:"4-2", section:"م2: النفط في الخليج — النفط كمورد استراتيجي رئيسي للحلفاء", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"نفط قطر كمورد استراتيجي + خريطة نادرة لآبار 1939" },
  { id:45, title:"تنقيح إتاوات النفط للشيخ من بابكو 10/6 A", archiveRef:"IOR/R/15/2 (10/6 A)", chapterId:4, sectionId:"4-2", section:"م2: النفط في الخليج — الشركات الأجنبية والامتيازات النفطية في ظل الحرب", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"الامتيازات النفطية في ظل الحرب — بابكو والبحرين" },
  { id:46, title:"ملف 28/33 التعويضات والتأمين ضد مخاطر الحرب", archiveRef:"IOR/R/15/2 (28/33)", chapterId:4, sectionId:"4-2", section:"م2: النفط في الخليج — الشركات الأجنبية والامتيازات النفطية في ظل الحرب", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"مخاطر الحرب على منشآت بابكو النفطية" },
  { id:47, title:"ملف 86/7 امتيازات النفط في الساحل المتصالح", archiveRef:"IOR/R/15/2 (86/7)", chapterId:4, sectionId:"4-2", section:"م2: النفط في الخليج — الشركات الأجنبية والامتيازات النفطية في ظل الحرب", priority:"★★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"الامتيازات النفطية في الساحل المتصالح (الإمارات)" },
  { id:48, title:"المتطلبات المدنية للخليج الفارسي (كهرباء الكويت بعد الحرب)", archiveRef:"IOR/L/PS/12/1010", chapterId:4, sectionId:"4-3", section:"م3: انعكاسات الحرب على البنية الاقتصادية — نشوء البنية التحتية الحديثة بعد الحرب", priority:"★★", category:"مصدر أولي", isNew:true, status:"لم يُراجع", notes:"نقص البنية التحتية في الكويت — جذور التحديث الاقتصادي" },
];

const COUNTRIES = ["السعودية","الكويت","البحرين","قطر","الإمارات/الساحل المتصالح","عُمان","بريطانيا","الولايات المتحدة","ألمانيا"];

// ============= UNIVERSAL SOURCE-TYPE SCHEMA =============
// كل تبويب في التطبيق يقرأ من هنا. تعديل واحد ينعكس على كل التبويبات.
const SOURCE_TYPES = [
  "كتاب عربي","كتاب أجنبي","رسالة ماجستير","أطروحة دكتوراه",
  "بحث علمي","مجلة علمية","مؤتمر علمي","صحيفة",
  "موقع إلكتروني","موسوعة","وثيقة أرشيفية","تقرير رسمي","مصدر أولي",
  // legacy aliases (kept so old saved data keeps working)
  "كتاب","رسالة علمية","بحث","مقالة","تقرير"
];
const CATEGORIES = SOURCE_TYPES;

// أقسام قائمة المراجع النهائية (الترتيب مُلزِم)
const BIB_SECTIONS_ORDER = [
  "الوثائق الأرشيفية والمصادر الأولية",
  "الكتب العربية والأجنبية",
  "الرسائل والأطاريح",
  "البحوث والمجلات العلمية",
  "المؤتمرات العلمية",
  "الصحف",
  "المواقع الإلكترونية والموسوعات",
];

function getBibSectionForType(cat) {
  const c = (cat || "").trim();
  if (["مصدر أولي","وثيقة أرشيفية","وثائق أرشيفية","تقرير رسمي","تقرير","archival","archive"].includes(c)) return "الوثائق الأرشيفية والمصادر الأولية";
  if (["كتاب","كتاب عربي","كتاب أجنبي","book","books"].includes(c)) return "الكتب العربية والأجنبية";
  if (["رسالة ماجستير","أطروحة دكتوراه","رسالة علمية","thesis","dissertation"].includes(c)) return "الرسائل والأطاريح";
  if (["بحث","بحث علمي","مجلة علمية","مقالة","article","journal"].includes(c)) return "البحوث والمجلات العلمية";
  if (["مؤتمر علمي","مؤتمر","conference","proceedings"].includes(c)) return "المؤتمرات العلمية";
  if (["صحيفة","صحف","جريدة","newspaper","newspapers"].includes(c)) return "الصحف";
  if (["موقع إلكتروني","رابط","website","موسوعة","encyclopedia","url"].includes(c)) return "المواقع الإلكترونية والموسوعات";
  return "الوثائق الأرشيفية والمصادر الأولية";
}

// نسّق اسم المؤلف: "Asaad Hamid Kanaan" → "Kanaan, Asaad Hamid"
function formatAuthorLastFirstUtil(fullName) {
  if (!fullName || !fullName.trim()) return "[مؤلف غير معروف]";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return fullName.trim();
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1).join(" ");
  return `${last}, ${rest}`;
}

// مولّد الاستشهاد الأكاديمي العربي حسب نوع المصدر.
// withPage=true → هامش (فيه ص##)؛ withPage=false → دخل ببليوغرافيا (بدون رقم صفحة، مؤلف Last,First).
function buildArabicCitation(doc, pageNum = "", withPage = true) {
  const cat = doc.category || doc.sourceType || doc.type || "وثيقة أرشيفية";
  const rawAuthor = doc.author || "";
  const author = withPage
    ? (rawAuthor || "[اسم المؤلف]")
    : formatAuthorLastFirstUtil(rawAuthor);
  const title = doc.title || "[العنوان]";
  const year  = doc.year  || doc.date || "د.ت";
  const page  = pageNum    || "[رقم الصفحة]";
  const pageSuffix = withPage ? `، ص${page}` : "";

  // كتاب (عربي / أجنبي / مطلق)
  if (cat === "كتاب" || cat === "كتاب عربي" || cat === "كتاب أجنبي") {
    const edition   = doc.edition   || "1";
    const place     = doc.place     || "[مكان النشر]";
    const publisher = doc.publisher || "[دار النشر]";
    return `${author}، ${title}، ط${edition}، (${place}: ${publisher}، ${year})${pageSuffix}.`;
  }
  // رسالة / أطروحة
  if (cat === "رسالة ماجستير" || cat === "أطروحة دكتوراه" || cat === "رسالة علمية") {
    const degree  = cat === "أطروحة دكتوراه" ? "أطروحة دكتوراه غير منشورة" : "رسالة ماجستير غير منشورة";
    const college = doc.college    || "[الكلية]";
    const univ    = doc.university || "[الجامعة]";
    return `${author}، "${title}"، (${degree})، ${college}، ${univ}، ${year}${pageSuffix}.`;
  }
  // بحث / مجلة
  if (cat === "بحث" || cat === "بحث علمي" || cat === "مجلة علمية" || cat === "مقالة") {
    const journal = doc.journal || doc.journalName || "[اسم المجلة]";
    const vol     = doc.volume  || "[م]";
    const iss     = doc.issue   || "[ع]";
    return `${author}، "${title}"، ${journal}، م${vol}، ع${iss}، (${year})${pageSuffix}.`;
  }
  // مؤتمر علمي
  if (cat === "مؤتمر علمي" || cat === "مؤتمر") {
    const conf  = doc.conference || doc.conferenceName || "[اسم المؤتمر]";
    const place = doc.place || "[المكان]";
    return `${author}، "${title}"، وقائع ${conf}، ${place}، ${year}${pageSuffix}.`;
  }
  // صحيفة
  if (cat === "صحيفة") {
    const newspaper = doc.newspaper || doc.title || "[اسم الصحيفة]";
    const issue     = doc.issue     || "[رقم العدد]";
    const date      = doc.date      || year;
    return `صحيفة ${newspaper}، العدد (${issue})، ${date}${pageSuffix}.`;
  }
  // موقع إلكتروني
  if (cat === "موقع إلكتروني" || cat === "رابط") {
    const url        = doc.url || doc.link || "[الرابط]";
    const visitDate  = doc.visitDate || doc.accessDate || "[تاريخ الزيارة]";
    return `${author}، ${title}، متاح على: ${url}، تاريخ الزيارة: ${visitDate}${pageSuffix}.`;
  }
  // موسوعة
  if (cat === "موسوعة") {
    const vol     = doc.volume    || "[م]";
    const edition = doc.edition   || "[الطبعة]";
    const pub     = doc.publisher || "[الناشر]";
    return `${title}، م${vol}، ط${edition}، (${pub}، ${year})${pageSuffix}.`;
  }
  // وثيقة أرشيفية / مصدر أولي / تقرير رسمي
  if (cat === "وثيقة أرشيفية" || cat === "مصدر أولي" || cat === "تقرير رسمي" || cat === "تقرير") {
    const ref = doc.archiveRef || doc.archiveNumber || "[الرقم الأرشيفي]";
    return `${title}، ${ref}، ${year}${pageSuffix}.`;
  }
  return `${author}، ${title}، (${year})${pageSuffix}.`;
}

// كشف نوع المصدر من رابط URL (للاستيراد التلقائي).
function detectSourceTypeFromUrl(url = "") {
  const u = url.toLowerCase();
  if (/qdl\.qa|nationalarchives|ior\//.test(u)) return "وثيقة أرشيفية";
  if (/jstor|sciencedirect|springer|tandfonline|doi\.org|researchgate/.test(u)) return "بحث علمي";
  if (/wikipedia|britannica|encyclopedia|maarefa|marefa/.test(u)) return "موسوعة";
  if (/aljazeera|bbc|reuters|nytimes|theguardian|alarabiya|alhayat|asharqalawsat|newspaper|news\./.test(u)) return "صحيفة";
  if (/google\.com\/books|books\.google|archive\.org\/details/.test(u)) return "كتاب";
  if (/thesis|dissertation|shamaa|dar\.bibalex/.test(u)) return "رسالة ماجستير";
  return "موقع إلكتروني";
}

function genRef(doc, fmt) {
  // الصيغ الأكاديمية الأجنبية (للاستخدام الإنجليزي)
  if (fmt === "APA" || fmt === "Chicago" || fmt === "MLA") {
    const a = doc.author || "مصدر أولي";
    const y = doc.year   || "د.ت";
    const t = doc.title;
    const r = doc.archiveRef ? ` [${doc.archiveRef}]` : "";
    if (fmt === "APA") return `${a} (${y}). ${t}.${r}`;
    return `${a}. "${t}."${r} ${y}.`;
  }
  // افتراضياً: الاستشهاد العربي حسب نوع المصدر (بدون رقم صفحة)
  return buildArabicCitation(doc, "", false);
}


export default function App() {
  const [page, setPage] = useState("home");
  const [aiModel, setAiModel] = useState(getSelectedModel());
  const BASE_DOC_IDS = React.useMemo(() => new Set(DOCS_FROM_INDEX.map(d => d.id)), []);
  const [deletedBaseDocs, setDeletedBaseDocs] = useState(() => {
    try {
      const v = localStorage.getItem("acadarchiv_deleted_base_docs");
      return new Set(v && v !== "undefined" ? JSON.parse(v) : []);
    } catch { return new Set(); }
  });
  const [docs, setDocs] = useState(() => {
    let deleted = new Set();
    try {
      const dv = localStorage.getItem("acadarchiv_deleted_base_docs");
      deleted = new Set(dv && dv !== "undefined" ? JSON.parse(dv) : []);
    } catch {}
    let userDocs = [];
    try {
      const v = localStorage.getItem("acadarchiv_user_docs");
      userDocs = v && v !== "undefined" ? JSON.parse(v) : [];
    } catch {}
    return [...userDocs, ...DOCS_FROM_INDEX.filter(d => !deleted.has(d.id))];
  });
  React.useEffect(() => {
    try {
      const userDocs = docs.filter(d => !BASE_DOC_IDS.has(d.id));
      localStorage.setItem("acadarchiv_user_docs", JSON.stringify(userDocs));
    } catch {}
  }, [docs, BASE_DOC_IDS]);
  React.useEffect(() => {
    try { localStorage.setItem("acadarchiv_deleted_base_docs", JSON.stringify([...deletedBaseDocs])); } catch {}
  }, [deletedBaseDocs]);



  // Unified delete: handles base docs, user-added docs, and library items.
  // Also cascades to bibliography and clears selection.
  const handleDeleteSource = (id) => {
    if (id == null) return;
    const isLibId = typeof id === "string" && id.startsWith("lib-");
    if (isLibId) {
      const realId = id.slice(4);
      const libIdNum = Number(realId);
      const target = library.find(s => String(s.id) === realId || s.id === libIdNum);
      setLibrary(prev => prev.filter(s => String(s.id) !== realId && s.id !== libIdNum));
      if (target) {
        if (target.storagePath) deleteLibraryFile(target.storagePath).catch(() => {});
        deleteLibraryRow(target.id).catch(() => {});
      }
      if (libSelected && (String(libSelected.id) === realId || libSelected.id === libIdNum)) setLibSelected(null);
    } else if (BASE_DOC_IDS.has(id)) {
      setDeletedBaseDocs(prev => { const n = new Set(prev); n.add(id); return n; });
      setDocs(prev => prev.filter(d => d.id !== id));
    } else {
      // user-added doc (also catches library items mistakenly passed by raw id)
      setDocs(prev => prev.filter(d => d.id !== id));
      const libMatch = library.find(s => s.id === id || String(s.id) === String(id));
      if (libMatch) {
        setLibrary(prev => prev.filter(s => s.id !== libMatch.id));
        if (libMatch.storagePath) deleteLibraryFile(libMatch.storagePath).catch(() => {});
        deleteLibraryRow(libMatch.id).catch(() => {});
        if (libSelected?.id === libMatch.id) setLibSelected(null);
      }
    }

    if (selectedDoc?.id === id) setSelectedDoc(null);
    // cascade to bibliography
    saveBibliography(prev => prev.filter(b => b.docId !== id && b.id !== id));
    showNotif("🗑️ تم حذف المصدر");
  };
  const deleteUserDoc = handleDeleteSource;

  const askDeleteSource = (id) => setConfirmDialog({
    title: "تأكيد الحذف",
    message: "هل أنت متأكد من حذف هذا المصدر؟\nلا يمكن التراجع عن هذا الإجراء.",
    onConfirm: () => handleDeleteSource(id),
  });
  const [searchFilters, setSearchFilters] = useState({ query:"", chapterId:"", priority:"", isNew:"", status:"" });
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [notif, setNotif] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState(null); // 'researcher' | 'supervisor' | null
  const [accessDenied, setAccessDenied] = useState(false);
  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>setUserEmail(data?.user?.email||""));
    getMyRole().then(({ role, enforced }) => {
      setUserRole(role);
      // Only show the "access denied" banner once the allow-list is actually
      // enforced (i.e. table exists) AND the user is not listed. Before the
      // Phase 4 migration is applied we deliberately fail-open so existing
      // sessions keep working.
      if (enforced && !role) setAccessDenied(true);
    });
  },[]);
  const [supervisorTab, setSupervisorTab] = useState(null); // set by NotificationBell → passed to SupervisorRoom
  const openSupervisorTab = useCallback((tab) => {
    setSupervisorTab(tab);
    setPage("supervisor");
  }, []);
  const handleLogout = useCallback(async ()=>{
    try { await supabase.auth.signOut(); } catch(e){}
    window.location.href = "/auth";
  },[]);
  const [exportFormat, setExportFormat] = useState("Chicago");
  const [exportSelected, setExportSelected] = useState([]);
  const [exportText, setExportText] = useState("");
  const [customFormats, setCustomFormats] = useState(() => {
    try { const v = localStorage.getItem("acadarchiv_custom_formats"); return v && v !== "undefined" ? JSON.parse(v) : []; } catch { return []; }
  });
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [editingCustomFmt, setEditingCustomFmt] = useState(null);
  const [customFmtForm, setCustomFmtForm] = useState({
    name: "", 
    templates: {
      "كتاب":        "{المؤلف}. {العنوان}. {مكان_النشر}: {الناشر}، {السنة}م.",
      "وثيقة أرشيفية": "{المؤلف}. {العنوان}. {الرقم_الأرشيفي}، {السنة}م.",
      "رسالة علمية":  "{المؤلف}. {العنوان}. رسالة {الدرجة}، {الجامعة}، {السنة}م.",
      "مقالة":       "{المؤلف}. \"{العنوان}\". {اسم_المجلة}، م{المجلد}، ع{العدد} ({السنة})، ص{الصفحات}.",
      "صحيفة":       "{المؤلف}. \"{العنوان}\". {اسم_الصحيفة}، {التاريخ}.",
      "موقع إلكتروني": "{المؤلف}. {العنوان}. متاح على: {الرابط}، تاريخ الزيارة: {تاريخ_الزيارة}.",
      "تقرير":       "{المؤلف}. {العنوان}. {الجهة}، {السنة}م.",
      "أطروحة دكتوراه": "{المؤلف}. {العنوان}. أطروحة دكتوراه، {الجامعة}، {السنة}م.",
    }
  });
  const EMPTY_ADD_FORM = { title:"",author:"",year:"",archiveRef:"",chapterId:"",section:"",priority:"★★",category:"وثيقة أرشيفية",country:"",keywords:"",notes:"",isNew:false,status:"لم يُراجع", edition:"", place:"", publisher:"", college:"", university:"", journal:"", volume:"", issue:"", pages:"", conference:"", newspaper:"", url:"", visitDate:"", agency:"" };
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [exportTypeFilter, setExportTypeFilter] = useState("");
  const [exportSearch, setExportSearch] = useState("");
  const [bulkFootnoteModal, setBulkFootnoteModal] = useState(null); // {items:[{doc,page}], generated:[{doc,text}]|null}
  const [urlImport, setUrlImport] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlResult, setUrlResult] = useState(null);
  const [urlPreview, setUrlPreview] = useState(null); // {title,sourceType,relevance,footnoteSummary,raw}
  const [multiUrlPreview, setMultiUrlPreview] = useState(null); // {items:[{...editable fields, chapterId}]}
  const [bookExtractLoading, setBookExtractLoading] = useState(false);
  const [structureSearch, setStructureSearch] = useState("");
  const [entityQuery, setEntityQuery] = useState("");
  const [entityLoading, setEntityLoading] = useState(false);
  const [entityResult, setEntityResult] = useState(null); // {definition, source, verifiable}
  const [tgMode, setTgMode] = useState(false);
  const [tgQuery, setTgQuery] = useState("");
  const [tgResults, setTgResults] = useState([]);
  const [tgLoading, setTgLoading] = useState(false);
  const aiInputRef = useRef(null);

  // ===== الميزة 1: إدارة ديناميكية لهيكل الأطروحة =====
  const [chapters, setChapters] = useState(() => {
    try {
      const saved = localStorage.getItem("acadarchiv_chapters");
      return saved ? JSON.parse(saved) : CHAPTERS_DATA.map(ch => ({ ...ch, sections: ch.sections.map(s => ({ ...s })) }));
    } catch { return CHAPTERS_DATA.map(ch => ({ ...ch, sections: ch.sections.map(s => ({ ...s })) })); }
  });
  const [editingChapter, setEditingChapter]   = useState(null); // { id, field:"titleAr", value }
  const [editingSection, setEditingSection]   = useState(null); // { chId, secId, value }

  const saveChapters = (updated) => {
    setChapters(updated);
    try { localStorage.setItem("acadarchiv_chapters", JSON.stringify(updated)); } catch {}
  };

  // ===== Phase 3a: Supabase cloud sync (chapters + user docs + deletion blacklist) =====
  const cloudHydratedRef = useRef(false);
  const syncUserDocsDebounced = useRef(debounce(syncUserDocs, 600)).current;
  const syncChaptersDebounced = useRef(debounce(syncChapters, 600)).current;
  const syncDeletedDebounced  = useRef(debounce(syncDeletedBaseDocs, 600)).current;
  const syncLibraryDebounced  = useRef(debounce(syncLibrary, 800)).current;
  const libHydratedRef = useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadPhase3a(CHAPTERS_DATA);
        if (cancelled || !data) { cloudHydratedRef.current = true; return; }
        setChapters(data.chapters);
        setDeletedBaseDocs(data.deletedBaseDocs);
        setDocs([
          ...data.userDocs,
          ...DOCS_FROM_INDEX.filter(d => !data.deletedBaseDocs.has(d.id)),
        ]);
      } catch (e) {
        console.warn("[cloudSync] load failed, using localStorage fallback", e);
      } finally {
        cloudHydratedRef.current = true;
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!cloudHydratedRef.current) return;
    const userDocs = docs.filter(d => !BASE_DOC_IDS.has(d.id));
    syncUserDocsDebounced(userDocs);
  }, [docs, BASE_DOC_IDS, syncUserDocsDebounced]);

  React.useEffect(() => {
    if (!cloudHydratedRef.current) return;
    syncChaptersDebounced(chapters);
  }, [chapters, syncChaptersDebounced]);

  React.useEffect(() => {
    if (!cloudHydratedRef.current) return;
    syncDeletedDebounced(deletedBaseDocs);
  }, [deletedBaseDocs, syncDeletedDebounced]);

  // Phase 3b: load library from cloud once on mount
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await loadLibrary();
        if (cancelled) return;
        if (items && items.length) setLibrary(items);
      } catch (e) { console.warn("[loadLibrary]", e); }
      finally { libHydratedRef.current = true; }
    })();
    return () => { cancelled = true; };
  }, []);

  // ===== Phase 3c: bibliography / cards / translations / custom_formats =====
  const bibHydratedRef = useRef(false);
  const cardsHydratedRef = useRef(false);
  const trHydratedRef = useRef(false);
  const fmtHydratedRef = useRef(false);
  const syncBibDebounced    = useRef(debounce(syncBibliography, 800)).current;
  const syncCardsDebounced  = useRef(debounce(syncCards, 800)).current;
  const syncTrDebounced     = useRef(debounce(syncTranslations, 1000)).current;
  const syncFmtDebounced    = useRef(debounce(syncCustomFormats, 800)).current;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bib, crd, trs, fmts] = await Promise.all([
          loadBibliography(), loadCards(), loadTranslations(), loadCustomFormats(),
        ]);
        if (cancelled) return;
        if (bib?.length)  setBibliography(bib);
        if (crd?.length)  setCards(crd);
        if (trs?.length)  setSavedTranslations(trs);
        if (fmts?.length) setCustomFormats(fmts);
      } catch (e) { console.warn("[phase3c.load]", e); }
      finally {
        bibHydratedRef.current = true;
        cardsHydratedRef.current = true;
        trHydratedRef.current = true;
        fmtHydratedRef.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, []);




  const commitChapterEdit = () => {
    if (!editingChapter) return;
    const updated = chapters.map(ch =>
      ch.id === editingChapter.id ? { ...ch, titleAr: editingChapter.value } : ch
    );
    // تحديث عنوان الفصل في الوثائق المرتبطة به
    setDocs(prev => prev.map(d =>
      d.chapterId === editingChapter.id
        ? { ...d, chapterTitle: editingChapter.value }
        : d
    ));
    saveChapters(updated);
    setEditingChapter(null);
    showNotif("✅ تم تحديث عنوان الفصل");
  };

  const commitSectionEdit = () => {
    if (!editingSection) return;
    const updated = chapters.map(ch =>
      ch.id === editingSection.chId
        ? { ...ch, sections: ch.sections.map(s => s.id === editingSection.secId ? { ...s, title: editingSection.value } : s) }
        : ch
    );
    // تحديث عنوان المبحث في الوثائق المرتبطة به
    setDocs(prev => prev.map(d =>
      d.sectionId === editingSection.secId
        ? { ...d, section: editingSection.value }
        : d
    ));
    saveChapters(updated);
    setEditingSection(null);
    showNotif("✅ تم تحديث عنوان المبحث وإعادة فرز الوثائق تلقائياً");
  };

  // ===== إضافة مبحث / فقرة فرعية ديناميكياً =====
  const [addingSecChId, setAddingSecChId]   = useState(null);
  const [newSecForm, setNewSecForm]         = useState({ title: "", num: "" });
  const [addingSubSecId, setAddingSubSecId] = useState(null);
  const [newSubForm, setNewSubForm]         = useState({ title: "" });

  const openAddSection = (chId) => {
    const ch = chapters.find(c => c.id === chId);
    const mainSecs = ch ? ch.sections.filter(s => !/[a-z]/i.test(s.id)) : [];
    setAddingSecChId(chId);
    setNewSecForm({ title: "", num: String(mainSecs.length + 1) });
    setAddingSubSecId(null);
  };

  const submitAddSection = (chId) => {
    const title = (newSecForm.title || "").trim();
    if (!title) { showNotif("⚠️ عنوان المبحث مطلوب", "error"); return; }
    const ch = chapters.find(c => c.id === chId);
    if (!ch) return;
    const num = (newSecForm.num || "").trim() || String(ch.sections.filter(s => !/[a-z]/i.test(s.id)).length + 1);
    const newId = `${chId}-${num}`;
    if (ch.sections.some(s => s.id === newId)) { showNotif("⚠️ رقم المبحث مستخدم بالفعل", "error"); return; }
    const fullTitle = title.startsWith("م") ? title : `م${num}: ${title}`;
    const updated = chapters.map(c =>
      c.id === chId ? { ...c, sections: [...c.sections, { id: newId, title: fullTitle, userAdded: true }] } : c
    );
    saveChapters(updated);
    setAddingSecChId(null);
    setNewSecForm({ title: "", num: "" });
    showNotif("✅ تم إضافة المبحث");
  };

  const openAddSubSection = (secId) => {
    setAddingSubSecId(secId);
    setNewSubForm({ title: "" });
    setAddingSecChId(null);
  };

  const submitAddSubSection = (chId, secId) => {
    const title = (newSubForm.title || "").trim();
    if (!title) { showNotif("⚠️ عنوان الفقرة الفرعية مطلوب", "error"); return; }
    const ch = chapters.find(c => c.id === chId);
    if (!ch) return;
    const subs = ch.sections.filter(s => s.id !== secId && s.id.startsWith(secId) && /^[a-z]+$/i.test(s.id.slice(secId.length)));
    const letter = String.fromCharCode(97 + subs.length);
    const newId = `${secId}${letter}`;
    const updated = chapters.map(c =>
      c.id === chId ? { ...c, sections: [...c.sections, { id: newId, title, userAdded: true }] } : c
    );
    saveChapters(updated);
    setAddingSubSecId(null);
    setNewSubForm({ title: "" });
    showNotif("✅ تم إضافة الفقرة الفرعية");
  };

  const askDeleteSection = (chId, secId) => {
    setConfirmDialog({
      title: "تأكيد الحذف",
      message: "هل تريد حذف هذا المبحث وكل فقراته الفرعية؟ لا يمكن التراجع.",
      onConfirm: () => {
        const updated = chapters.map(c =>
          c.id === chId
            ? { ...c, sections: c.sections.filter(s => {
                if (s.id === secId) return false;
                if (s.id.startsWith(secId) && /^[a-z]+$/i.test(s.id.slice(secId.length))) return false;
                return true;
              }) }
            : c
        );
        saveChapters(updated);
        showNotif("🗑️ تم حذف المبحث");
      }
    });
  };



  // ===== الميزة 2: نافذة توليد الهامش الفوري =====
  const [footnoteModal, setFootnoteModal]     = useState(null); // الوثيقة المستهدفة
  const [confirmDialog, setConfirmDialog]     = useState(null); // {title,message,onConfirm}
  const [footnotePageNum, setFootnotePageNum] = useState("");
  const [footnoteResult, setFootnoteResult]   = useState("");
  const footnotePageRef = useRef(null);

  const generateFootnote = (doc, pageNum) => {
    return buildArabicCitation(doc, pageNum, true);
  };

  const openFootnoteModal = (doc) => {
    setFootnoteModal(doc);
    setFootnotePageNum("");
    setFootnoteResult("");
    setTimeout(() => footnotePageRef.current?.focus(), 100);
  };

  // التحقق من رقم الصفحة قبل أي معالجة
  const validatePageNumber = () => {
    const p = (footnotePageNum || "").trim();
    if (!p) {
      showNotif("⚠️ رقم الصفحة مطلوب قبل توليد الهامش أو إضافة المرجع", "error");
      setTimeout(() => footnotePageRef.current?.focus(), 50);
      return false;
    }
    return true;
  };

  const handleGenerateFootnote = () => {
    if (!footnoteModal) return;
    if (!validatePageNumber()) return;
    const result = generateFootnote(footnoteModal, footnotePageNum.trim());
    setFootnoteResult(result);
  };

  // نسخ + تسجيل في المراجع النهائية بضغطة واحدة (يجبر إدخال رقم الصفحة أولاً)
  const copyFootnoteAndRegister = async () => {
    if (!footnoteModal) return;
    if (!validatePageNumber()) return;
    const result = (footnoteResult && footnoteResult.trim())
      ? footnoteResult
      : generateFootnote(footnoteModal, footnotePageNum.trim());
    addToBibliography(footnoteModal, result);
    try {
      await navigator.clipboard.writeText(result);
      showNotif("✅ تم نسخ الهامش وإضافة المصدر للمراجع النهائية");
    } catch {
      showNotif("✅ تمت إضافة المصدر للمراجع النهائية — انسخ الهامش يدوياً إذا لم تسمح الحافظة", "warn");
    }
    setTimeout(() => setFootnoteModal(null), 2000);
  };


  // ===== الميزة 3: قائمة المصادر والمراجع النهائية =====
  const [bibliography, setBibliography] = useState(() => {
    try { const v = localStorage.getItem("acadarchiv_bibliography"); return v && v !== "undefined" ? JSON.parse(v) : []; } catch { return []; }
  });

  // يقبل مصفوفة أو دالة محدِّث
  const saveBibliography = (updater) => {
    setBibliography(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try { localStorage.setItem("acadarchiv_bibliography", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // aliases للحفاظ على التوافق الخلفي
  const formatAuthorLastFirst = formatAuthorLastFirstUtil;
  const getBibSection = getBibSectionForType;

  const addToBibliography = (doc, footnoteText) => {
    if (!doc) return;
    const cat     = doc.category || doc.sourceType || "وثيقة أرشيفية";
    const section = getBibSectionForType(cat);
    const author  = doc.author || "";
    const authorFormatted = formatAuthorLastFirstUtil(author);
    const year    = doc.year   || "د.ت";
    const title   = doc.title  || "";
    // بناء نص المرجع بدون رقم الصفحة باستخدام البنّاء الموحَّد
    const bibEntry = buildArabicCitation(doc, "", false);

    const newEntry = {
      id:        Date.now() + Math.random(),
      docId:     doc.id,
      section,
      author:    authorFormatted,
      title,
      year,
      category:  cat,
      bibEntry,
      sortKey:   author ? authorFormatted : title,
      addedAt:   new Date().toLocaleDateString("ar-IQ"),
    };

    saveBibliography(prev => {
      const dup = prev.some(b => b.docId === doc.id || b.bibEntry === bibEntry);
      if (dup) { showNotif("ℹ️ المصدر موجود مسبقاً في قائمة المراجع"); return prev; }
      return [...prev, newEntry];
    });
  };

  // ترتيب المراجع: أقسام عربية ثم أبجدي
  const BIBO_SECTIONS_ORDER = BIB_SECTIONS_ORDER;


  const getBibGrouped = () => {
    const grouped = {};
    BIBO_SECTIONS_ORDER.forEach(s => { grouped[s] = []; });
    bibliography.forEach(b => {
      const sec = grouped[b.section] ? b.section : getBibSection(b.category);
      grouped[sec].push(b);
    });
    BIBO_SECTIONS_ORDER.forEach(s => {
      grouped[s].sort((a, b) => (a.sortKey || "").localeCompare(b.sortKey || "", "ar"));
    });
    return grouped;
  };

  const copyFullBibliography = () => {
    const grouped = getBibGrouped();
    let text = "قائمة المصادر والمراجع\n";
    text += "═".repeat(40) + "\n\n";
    BIBO_SECTIONS_ORDER.forEach(sec => {
      if (!grouped[sec]?.length) return;
      text += `◆ ${sec}\n${"─".repeat(30)}\n`;
      grouped[sec].forEach((b, i) => { text += `${i + 1}. ${b.bibEntry}\n`; });
      text += "\n";
    });
    navigator.clipboard.writeText(text).then(() => showNotif("✅ تم نسخ قائمة المراجع كاملة"));
  };

  const removeFromBibliography = (id) => {
    saveBibliography(prev => prev.filter(b => b.id !== id));
    showNotif("🗑️ تم حذف المرجع من القائمة");
  };

  // ===== مكتبتي البحثية (Phase 3b — cloud-backed via library_sources) =====
  const [library, setLibrary] = useState([]);
  const [libUploading, setLibUploading] = useState(false);
  const [libAnalyzing, setLibAnalyzing] = useState(null); // id المصدر الجاري تحليله
  const [libFilter, setLibFilter] = useState({ query:"", chapterId:"", category:"", priority:"" });
  const [libSelected, setLibSelected] = useState(null);
  const [libUrlInput, setLibUrlInput] = useState("");
  const [libUrlLoading, setLibUrlLoading] = useState(false);
  const libFileRef = useRef(null);

  // Legacy alias — retained so existing callers don't crash. Cloud writes now
  // happen through insertLibraryRow / updateLibraryRow / deleteLibraryRow.
  const saveLibrary = (updated) => { setLibrary(updated); };





  // Build a structured view of the live `chapters` state for AI prompts.
  // Sub-sections are detected by trailing lowercase letter (e.g. "2-1a" under "2-1").
  const buildThesisStructure = () => {
    return chapters.map(ch => {
      const tops = ch.sections.filter(s => !/[a-z]$/i.test(String(s.id)));
      return {
        chapterId: ch.id,
        chapterTitle: ch.titleAr,
        sections: tops.map(s => ({
          sectionId: s.id,
          sectionTitle: s.title,
          subSections: ch.sections
            .filter(sub => sub.id !== s.id && String(sub.id).startsWith(String(s.id)) && /[a-z]$/i.test(String(sub.id)))
            .map(sub => ({ subId: sub.id, subTitle: sub.title })),
        })),
      };
    });
  };

  // Validate AI selection against the live structure; fall back gracefully.
  const reconcileClassification = (parsed) => {
    if (!parsed || typeof parsed !== "object") return parsed;
    let chId = typeof parsed.chapterId === "string" ? parseInt(parsed.chapterId) : parsed.chapterId;
    const ch = chapters.find(c => c.id === chId) || chapters[0];
    if (!ch) return parsed;
    chId = ch.id;
    let secId = parsed.sectionId || "";
    let subId = parsed.subSectionId || parsed.subId || "";
    const allSecIds = ch.sections.map(s => String(s.id));
    if (subId && !allSecIds.includes(String(subId))) subId = "";
    if (secId && !allSecIds.includes(String(secId))) secId = "";
    // If subId given but secId missing, derive secId by stripping trailing letter
    if (!secId && subId) secId = String(subId).replace(/[a-z]$/i, "");
    // Fallback to first top-level section
    if (!secId) {
      const firstTop = ch.sections.find(s => !/[a-z]$/i.test(String(s.id))) || ch.sections[0];
      secId = firstTop?.id || "";
    }
    const secObj = ch.sections.find(s => String(s.id) === String(secId));
    const subObj = ch.sections.find(s => String(s.id) === String(subId));
    return {
      ...parsed,
      chapterId: chId,
      chapterName: parsed.chapterName || ch.titleAr,
      sectionId: secId,
      sectionName: parsed.sectionName || secObj?.title || "",
      subSectionId: subId || null,
      subSectionName: parsed.subSectionName || subObj?.title || "",
      classificationReason: parsed.reason || parsed.classificationReason || "",
      classificationConfidence: parsed.confidence || parsed.classificationConfidence || "",
    };
  };

  const analyzeSource = async (src, payload) => {
    // payload: { text } for md/txt/docx, or { base64, mimeType } for pdf
    setLibAnalyzing(src.id);
    const thesisStructure = buildThesisStructure();
    const prompt = `أنت مساعد بحثي متخصص في تاريخ "الخليج العربي خلال الحرب العالمية الثانية 1939-1945".

حلّل هذا المصدر (الملف مرفق${payload?.base64 ? " كـ PDF — استخرج النص منه ولو كان ممسوحاً ضوئياً (OCR)" : ""}).

هذا هو الهيكل الكامل للأطروحة بفصولها ومباحثها وفقراتها (اختر **فقط** من المعرفات الموجودة أدناه ولا تخترع جديدة):
${JSON.stringify(thesisStructure, null, 2)}

اسم الملف: ${src.fileName}
نوع الملف: ${src.fileType}

بناءً على محتوى المصدر، حدد:
1. رقم الفصل الأنسب (chapterId)
2. معرف المبحث الأنسب (sectionId) من القائمة أعلاه
3. معرف الفقرة الفرعية (subSectionId) إن وُجدت فقرة مناسبة، وإلا اتركها null

أجب بـ JSON فقط بدون أي نص آخر وبدون code fences:
{
  "title": "عنوان المصدر المستخلص من المحتوى",
  "author": "المؤلف",
  "year": "السنة (رقم أو null)",
  "language": "عربي أو إنجليزي أو أخرى",
  "sourceType": "كتاب أو رسالة علمية أو بحث أو مقالة أو صحيفة أو وثيقة أرشيفية أو تقرير أو أطروحة دكتوراه",
  "chapterId": 1,
  "chapterName": "اسم الفصل المناسب",
  "sectionId": "1-1",
  "sectionName": "نص المبحث",
  "subSectionId": null,
  "subSectionName": "",
  "confidence": "high أو medium أو low",
  "reason": "سبب اختيار هذا المبحث تحديداً بناءً على محتوى المصدر",
  "sections": ["م1: ...", "م2: ..."],
  "priority": "★★★ أو ★★ أو ★",
  "importantPages": "صفحات مهمة مع أرقامها مثل: 45-67، 102، 230-245",
  "summary": "ملخص أكاديمي موجز (4-5 أسطر) مستخلص من المحتوى الفعلي",
  "keywords": ["كلمة1","كلمة2","كلمة3","كلمة4","كلمة5"],
  "whyImportant": "لماذا هذا المصدر مهم للأطروحة",
  "howToUse": "كيف تستخدمه في الكتابة",
  "keyPoints": [{"page":"12","point":"نقطة مهمة"},{"page":"45-47","point":"..."}]
}`;

    try {
      const data = await analyzeDocumentLLM({
        prompt,
        fileName: src.fileName,
        mimeType: payload?.mimeType,
        base64: payload?.base64,
        text: payload?.text,
        max_tokens: 2200,
      });
      const text = data.content?.map(c => c.text || "").join("") || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const match = clean.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : clean);
      return reconcileClassification(parsed);
    } catch (err) {
      console.error("[analyzeSource]", err);
      return null;
    } finally {
      setLibAnalyzing(null);
    }
  };

  // Standalone classifier — used by URL import and manual add to map a source
  // into the live chapter/section/sub-section structure.
  const classifyToStructure = async ({ title, author = "", summary = "", sourceType = "", extraContext = "" }) => {
    const thesisStructure = buildThesisStructure();
    try {
      const data = await callLLM({
        max_tokens: 600,
        messages: [{
          role: "user",
          content: `صنّف هذا المصدر داخل هيكل الأطروحة التالية. اختر **فقط** من المعرفات الموجودة ولا تخترع جديدة.

الهيكل:
${JSON.stringify(thesisStructure, null, 2)}

بيانات المصدر:
- العنوان: ${title || "—"}
- المؤلف: ${author || "—"}
- النوع: ${sourceType || "—"}
- ملخص/سياق: ${summary || extraContext || "—"}

أجب بـ JSON فقط بدون code fences:
{"chapterId":1,"chapterName":"","sectionId":"","sectionName":"","subSectionId":null,"subSectionName":"","confidence":"high|medium|low","reason":""}`
        }]
      });
      const text = data.content?.map(c => c.text || "").join("") || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const match = clean.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : clean);
      return reconcileClassification(parsed);
    } catch (err) {
      console.error("[classifyToStructure]", err);
      return null;
    }
  };

  const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => {
      const result = e.target.result || "";
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const readFileAsText = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result || "");
    r.onerror = reject;
    r.readAsText(file, "utf-8");
  });

  const MAX_LIB_FILE_SIZE = 500 * 1024 * 1024; // 500MB per file
  const MAX_LIB_FILES_BATCH = 20; // up to 20 files at once
  const MAX_LIB_TOTAL_SIZE = 1024 * 1024 * 1024; // 1GB total per batch

  // Functional update for library — updates state only. Cloud persistence
  // happens through insertLibraryRow / updateLibraryRow which callers invoke
  // alongside the state update.
  const updateLibrary = (updater) => {
    setLibrary(prev => (typeof updater === "function" ? updater(prev) : updater));
  };


  const handleLibFileUpload = async (files) => {
    if (!files?.length) return;
    const fileArr = Array.from(files);
    if (fileArr.length > MAX_LIB_FILES_BATCH) {
      showNotif(`⚠️ يمكن رفع حتى ${MAX_LIB_FILES_BATCH} ملف دفعة واحدة فقط`, "error");
      return;
    }
    const totalSize = fileArr.reduce((s, f) => s + f.size, 0);
    if (totalSize > MAX_LIB_TOTAL_SIZE) {
      showNotif(`⚠️ الحجم الإجمالي يتجاوز 1 غيغابايت — قلل عدد الملفات`, "error");
      return;
    }
    setLibUploading(true);
    const IMG_EXT = ["jpg","jpeg","png","webp","gif","tif","tiff","bmp","heic"];
    for (const file of fileArr) {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const isImage = IMG_EXT.includes(ext);
      if (!["pdf","md","txt","docx", ...IMG_EXT].includes(ext)) {
        showNotif(`⚠️ ${file.name} — يُقبل: PDF, DOCX, MD, TXT, صور (JPG/PNG/TIFF…)`, "error");
        continue;
      }
      if (file.size > MAX_LIB_FILE_SIZE) {
        showNotif(`حجم الملف كبير جداً — الحد الأقصى 500 ميغابايت`, "error");
        continue;
      }

      // Extract content per type — unified pipeline: every file becomes either
      // raw text OR a base64 blob sent to Gemini multimodal (handles OCR natively).
      let payload = null;
      let storedText = null;
      try {
        if (ext === "pdf") {
          const base64 = await readFileAsBase64(file);
          payload = { base64, mimeType: "application/pdf" };
        } else if (isImage) {
          const base64 = await readFileAsBase64(file);
          const mime = file.type || `image/${ext === "jpg" ? "jpeg" : ext}`;
          payload = { base64, mimeType: mime };
        } else if (ext === "docx") {
          const arrayBuffer = await file.arrayBuffer();
          const { value } = await mammoth.extractRawText({ arrayBuffer });
          storedText = value || "";
          payload = { text: storedText };
        } else {
          storedText = await readFileAsText(file);
          payload = { text: storedText };
        }
      } catch (err) {
        console.error("[lib-upload-extract]", err);
        showNotif(`⚠️ تعذّر قراءة ${file.name}`, "error");
        continue;
      }

      const srcId = Date.now() + Math.random();
      // Phase 3b: upload original file to thesis-files bucket (fire-and-forget — analysis continues)
      let storagePath = null;
      try { storagePath = await uploadLibraryFile(file); } catch (e) { console.warn("[storage-upload]", e); }
      const newSrc = {
        id: srcId, fileName: file.name, fileType: ext, fileSize: file.size,
        uploadDate: new Date().toLocaleDateString("ar-IQ"),
        status: "جاري التحليل...", analyzed: false,
        title:"", author:"", year:"", language:"", sourceType:"",
        chapterId: null, sections:[], priority:"★★",
        importantPages:"", summary:"", keywords:[], whyImportant:"", howToUse:"",
        keyPoints: [],
        storagePath,
        fileData: storedText, // text only; binary content lives in Storage
      };
      updateLibrary(prev => [newSrc, ...prev]);
      // Persist to Supabase immediately so the row appears in library_sources
      // and shows up on other browsers via loadLibrary().
      const { error: insErr } = await insertLibraryRow(newSrc);
      if (insErr) showNotif("⚠️ فشل حفظ المصدر في السحابة", "error");

      const analysis = await analyzeSource(newSrc, payload);
      const analyzed = analysis && (analysis.title || analysis.summary || analysis.chapterId)
        ? { ...newSrc, ...analysis, analyzed: true, status: "تم التحليل ✅" }
        : { ...newSrc, analyzed: false, status: "فشل التحليل ⚠️ — عدّل يدوياً" };
      updateLibrary(prev => prev.map(s => s.id === srcId ? analyzed : s));
      // Upsert the analyzed version too so title/summary/keywords are stored.
      await insertLibraryRow(analyzed);

    }
    setLibUploading(false);
    showNotif("✅ اكتمل رفع وتحليل الملفات");
  };


  const handleLibUrlImport = async () => {
    if (!libUrlInput.trim()) return;
    setLibUrlLoading(true);
    try {
      const thesisStructure = buildThesisStructure();
      const data = await callLLM({
          max_tokens: 1800,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: `اذهب لهذا الرابط واستخرج بيانات المصدر لأطروحة "الخليج العربي في الحرب العالمية الثانية 1939-1945":\n${libUrlInput}\n\nهذا هو هيكل الأطروحة (اختر فقط من المعرفات أدناه ولا تخترع جديدة):\n${JSON.stringify(thesisStructure, null, 2)}\n\nأجب بـ JSON فقط بدون code fences:\n{"title":"","author":"","year":null,"language":"","sourceType":"","chapterId":1,"chapterName":"","sectionId":"","sectionName":"","subSectionId":null,"subSectionName":"","confidence":"high|medium|low","reason":"","sections":[],"priority":"★★","importantPages":"","summary":"","keywords":[],"whyImportant":"","howToUse":"","fileName":"${libUrlInput}"}` }]
        });
      const text = data.content?.map(c => c.text || "").join("") || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const match = clean.match(/\{[\s\S]*\}/);
      const rawParsed = JSON.parse(match ? match[0] : clean);
      const parsed = reconcileClassification(rawParsed);
      const newSrc = {
        id: Date.now(), fileName: libUrlInput, fileType: "url",
        uploadDate: new Date().toLocaleDateString("ar-IQ"),
        status: "تم التحليل ✅", analyzed: true, ...parsed
      };
      setLibrary(prev => [newSrc, ...prev]);
      const { error: insErr } = await insertLibraryRow(newSrc);
      if (insErr) showNotif("⚠️ فشل حفظ الرابط في السحابة", "error");
      setLibUrlInput("");
      showNotif("✅ تمت إضافة المصدر من الرابط");
    } catch {
      showNotif("⚠️ تعذّر استخراج البيانات — حاول مرة أخرى", "error");
    }
    setLibUrlLoading(false);
  };

  const updateLibSrc = (id, changes) => {
    setLibrary(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s));
    if (libSelected?.id === id) setLibSelected({ ...libSelected, ...changes });
    // Fire-and-forget cloud update.
    updateLibraryRow(id, changes).then(({ error }) => {
      if (error) showNotif("⚠️ فشل تحديث المصدر في السحابة", "error");
    });
  };

  const deleteLibSrc = (id) => {
    const target = library.find(s => s.id === id);
    if (target?.storagePath) { deleteLibraryFile(target.storagePath).catch(() => {}); }
    setLibrary(prev => prev.filter(s => s.id !== id));
    if (libSelected?.id === id) setLibSelected(null);
    deleteLibraryRow(id).then(({ error }) => {
      if (error) showNotif("⚠️ فشل حذف المصدر من السحابة", "error");
    });
    showNotif("🗑️ تم حذف المصدر");
  };


  // Expose a signed-URL helper for the library UI (PDF/image preview from Storage).
  const openLibStorageFile = async (path) => {
    const url = await getLibraryFileUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else showNotif("⚠️ تعذّر فتح الملف", "error");
  };

  const filteredLib = library.filter(s => {
    const q = libFilter.query.toLowerCase();
    if (q && !s.title?.toLowerCase().includes(q) && !s.author?.toLowerCase().includes(q) && !s.fileName?.toLowerCase().includes(q) && !(s.keywords||[]).join(" ").toLowerCase().includes(q)) return false;
    if (libFilter.chapterId && s.chapterId !== parseInt(libFilter.chapterId)) return false;
    if (libFilter.category && (s.sourceType || s.category) !== libFilter.category) return false;
    if (libFilter.priority && s.priority !== libFilter.priority) return false;
    return true;
  });

  const showNotif = (msg, type="success") => {
    setNotif({msg, type});
    setTimeout(()=>setNotif(null), 3500);
  };

  // ===== Unified source list: merges archival docs + My Library items =====
  // Library items are mapped to a doc-shaped record so they appear automatically
  // in Thesis Structure, Home Dashboard counts, Export page, and AI Assistant.
  const combinedDocs = (() => {
    const libAsDocs = (library || []).map(s => {
      // Prefer the most specific placement: sub-section > section > legacy sections[0]
      const secId = s.subSectionId || s.sectionId || (Array.isArray(s.sections) && s.sections[0]) || "";
      return {
        id: typeof s.id === "string" && s.id.startsWith("lib-") ? s.id : `lib-${s.id}`,
        title: s.title || s.fileName || "مصدر من المكتبة",
        archiveRef: s.archiveRef || s.fileName || "",
        chapterId: typeof s.chapterId === "string" ? parseInt(s.chapterId) : s.chapterId,
        sectionId: secId,
        section: s.section || (Array.isArray(s.sections) ? s.sections.join("، ") : ""),
        priority: s.priority || "★★",
        category: s.sourceType || s.category || "كتاب",
        isNew: true,
        status: s.status || (s.analyzed ? "تم التحليل ✅" : "لم يُراجع"),
        notes: s.summary || s.whyImportant || "",
        author: s.author || "",
        year: s.year || "",
        fromLibrary: true,
      };
    });
    return [...docs, ...libAsDocs];
  })();

  const filtered = docs.filter(d => {
    const q = searchFilters.query.toLowerCase();
    if (q && !d.title.toLowerCase().includes(q) && !(d.archiveRef||"").toLowerCase().includes(q) && !(d.notes||"").toLowerCase().includes(q) && !(d.section||"").toLowerCase().includes(q)) return false;
    if (searchFilters.chapterId && d.chapterId !== parseInt(searchFilters.chapterId)) return false;
    if (searchFilters.priority && d.priority !== searchFilters.priority) return false;
    if (searchFilters.isNew === "new" && !d.isNew) return false;
    if (searchFilters.status && d.status !== searchFilters.status) return false;
    return true;
  }).sort((a,b) => {
    const p = {"★★★":3,"★★":2,"★":1};
    return (p[b.priority]||0) - (p[a.priority]||0);
  });

  const stats = {
    total: combinedDocs.length,
    highP: combinedDocs.filter(d=>d.priority==="★★★").length,
    newDocs: combinedDocs.filter(d=>d.isNew).length,
    unreviewed: combinedDocs.filter(d=>d.status==="لم يُراجع").length,
    byChapter: CHAPTERS_DATA.map(ch=>({ ...ch, count: combinedDocs.filter(d=>d.chapterId===ch.id).length })),
  };

  // استيراد من رابط URL عبر Claude AI
  const handleUrlImport = async () => {
    if (!urlImport.trim()) return;
    setUrlLoading(true);
    setUrlResult(null);
    try {
      const structureHint = chapters.map(ch => `- [${ch.id}] ${ch.titleAr}`).join("\n");
      const data = await callLLM({
          max_tokens:3500,
          messages:[{
            role:"user",
            content:`اقرأ محتوى الصفحة على الرابط التالي واستخرج **جميع** المصادر/المراجع المذكورة فيها (قائمة كتب، ببليوغرافيا، نتائج بحث، فهرس وثائق… استهدف 10-20 عنصراً إن وُجدت). لا تختر مصدراً واحداً فقط.
الرابط: ${urlImport}

هيكل الأطروحة (للترشيح):
${structureHint}

أعد JSON خالصاً فقط بدون أي شرح وبدون \`\`\`:
{
  "sources": [
    {
      "title": "العنوان",
      "author": "المؤلف (اسم العائلة، الاسم الأول)",
      "year": "السنة أو null",
      "publisher": "الناشر",
      "place": "مكان النشر",
      "edition": "الطبعة",
      "journal": "المجلة إن كان مقالاً",
      "volume": "المجلد",
      "issue": "العدد",
      "pages": "الصفحات",
      "university": "الجامعة إن كان رسالة",
      "archiveRef": "رقم الأرشيف إن وُجد",
      "url": "رابط الوصول إن وُجد",
      "sourceType": "أحد: كتاب عربي|كتاب أجنبي|رسالة ماجستير|أطروحة دكتوراه|بحث علمي|مجلة علمية|مؤتمر علمي|صحيفة|موقع إلكتروني|موسوعة|وثيقة أرشيفية|تقرير رسمي|مصدر أولي",
      "suggestedChapterId": رقم_الفصل_المقترح_أو_null,
      "relevance": "سطر واحد عن صلته بأطروحة الخليج العربي 1939-1945",
      "footnoteSummary": "ملخص مقترح للحاشية (سطران)"
    }
  ]
}

إن وجدت مصدراً واحداً فقط فأعده داخل المصفوفة. اعتمد على بيانات الصفحة فعلياً ولا تختلق مصادر.`
          }]
        });
      const text = data.content?.map(c=>c.text||"").join("") || "";
      const clean = text.replace(/```json|```/g,"").trim();
      const m = clean.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : clean);
      const rawItems = Array.isArray(parsed.sources) ? parsed.sources : (parsed.title ? [parsed] : []);
      if (rawItems.length === 0) {
        showNotif("⚠️ لم يتم العثور على مصادر قابلة للاستخراج", "warn");
        setUrlLoading(false);
        return;
      }
      const items = rawItems.map((s, i) => ({
        ...s,
        _idx: i,
        sourceType: s.sourceType || detectSourceTypeFromUrl(s.url || urlImport),
        url: s.url || urlImport,
        chapterId: s.suggestedChapterId || "",
        keep: true,
      }));
      if (items.length === 1) {
        const parsedOne = items[0];
        setUrlResult(parsedOne);
        setUrlPreview({
          title: parsedOne.title || "",
          sourceType: parsedOne.sourceType,
          relevance: parsedOne.relevance || "—",
          footnoteSummary: parsedOne.footnoteSummary || "—",
          raw: parsedOne,
        });
      } else {
        setMultiUrlPreview({ items });
      }
      showNotif(`✅ تم استخراج ${items.length} مصدر — راجع المعاينة قبل الحفظ`);
    } catch (e) {
      console.error("[url-import]", e);
      showNotif("⚠️ تعذّر استخراج البيانات تلقائياً — يمكنك الإدخال يدوياً", "warn");
    }
    setUrlLoading(false);
  };

  // حفظ جميع المصادر من معاينة الاستيراج المتعدد إلى docs مباشرة
  const saveAllMultiUrl = () => {
    if (!multiUrlPreview) return;
    const toSave = multiUrlPreview.items.filter(it => it.keep && it.title);
    if (toSave.length === 0) { showNotif("لا توجد مصادر محددة للحفظ", "warn"); return; }
    const baseId = Date.now();
    const newDocs = toSave.map((it, i) => ({
      id: baseId + i,
      title: it.title,
      author: it.author || "",
      year: it.year || null,
      publisher: it.publisher || "",
      place: it.place || "",
      edition: it.edition || "",
      journal: it.journal || "",
      volume: it.volume || "",
      issue: it.issue || "",
      pages: it.pages || "",
      university: it.university || "",
      archiveRef: it.archiveRef || "",
      url: it.url || "",
      sourceType: it.sourceType || "وثيقة أرشيفية",
      category:   it.sourceType || "وثيقة أرشيفية",
      chapterId: it.chapterId ? parseInt(it.chapterId) : null,
      section: "",
      sectionId: "",
      priority: "★★",
      notes: it.footnoteSummary || it.relevance || "",
      keywords: "",
      isNew: true,
      status: "لم يُراجع",
    }));
    setDocs(prev => [...newDocs, ...prev]);
    setMultiUrlPreview(null);
    showNotif(`✅ تم حفظ ${newDocs.length} مصدر في قاعدة الوثائق`);
    setPage("search");
  };

  // تأكيد الحفظ من نافذة معاينة الرابط — يملأ النموذج ويفتح صفحة الإضافة
  const confirmUrlPreview = () => {
    if (!urlPreview) return;
    const parsed = urlPreview.raw || {};
    const detectedType = urlPreview.sourceType || parsed.sourceType || "وثيقة أرشيفية";
    setAddForm(prev => ({
      ...prev,
      ...parsed,
      title: parsed.title || urlPreview.title || "",
      author: parsed.author || "",
      year: parsed.year || "",
      archiveRef: parsed.archiveRef || "",
      category: detectedType,
      sourceType: detectedType,
      notes: urlPreview.footnoteSummary || parsed.notes || "",
      keywords: parsed.keywords || "",
    }));
    setUrlPreview(null);
    setPage("add");
    showNotif("✅ تم نقل البيانات إلى نموذج الإضافة");
  };

  // ===== استخراج تلقائي لبيانات الكتاب من العنوان/المؤلف =====
  const extractBookMetadata = async () => {
    const title = (addForm.title||"").trim();
    if (!title) { showNotif("أدخل عنوان الكتاب أولاً", "warn"); return; }
    setBookExtractLoading(true);
    try {
      const data = await callLLM({
        max_tokens: 600,
        messages: [{
          role: "user",
          content: `استخرج بيانات الكتاب التالية بناءً على معرفتك الببليوغرافية الموثوقة فقط، ولا تختلق:
العنوان: "${title}"
${addForm.author ? `المؤلف المعروف: ${addForm.author}` : ""}

أعد JSON خالصاً فقط (بدون \`\`\`):
{
  "author": "اسم العائلة، الاسم الأول",
  "publisher": "دار النشر",
  "place": "مكان النشر",
  "year": "السنة",
  "edition": "الطبعة (الأولى/الثانية/…)",
  "verified": true_or_false
}
إن لم تتوفر معلومة موثوقة لحقل، اتركه فارغاً ("").`
        }]
      });
      const text = data.content?.map(c=>c.text||"").join("") || "{}";
      const clean = text.replace(/```json|```/g,"").trim();
      const m = clean.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : clean);
      setAddForm(prev => ({
        ...prev,
        author: parsed.author || prev.author,
        publisher: parsed.publisher || prev.publisher,
        place: parsed.place || prev.place,
        year: parsed.year || prev.year,
        edition: parsed.edition || prev.edition,
      }));
      showNotif(parsed.verified === false ? "⚠️ بيانات تقريبية — راجعها قبل الحفظ" : "✅ تم استخراج بيانات الكتاب");
    } catch (e) {
      console.error("[book-extract]", e);
      showNotif("تعذّر الاستخراج التلقائي", "error");
    }
    setBookExtractLoading(false);
  };


  // ===== المعرّف الأكاديمي للكيانات (شخص/مكان/جهة) =====
  const handleEntityLookup = async () => {
    const q = entityQuery.trim();
    if (!q) return;
    setEntityLoading(true);
    setEntityResult(null);
    try {
      const data = await callLLM({
        max_tokens: 1400,
        messages: [{
          role: "user",
          content: `أنت مساعد بحثي صارم لأطروحة دكتوراه: "الخليج العربي خلال الحرب العالمية الثانية 1939-1945".
الباحث يطلب تعريفاً أكاديمياً موثوقاً للكيان: "${q}".

متطلبات التعريف:
- اكتب تعريفاً مكثفاً في **ثمانية أسطر بالعربية الفصحى** بدقة أكاديمية عالية.
- اربط الكيان بسياقه التاريخي وبمنطقة الخليج العربي خلال 1939-1945 إن أمكن.
- لا تستخدم حشواً أو عبارات إنشائية؛ كل سطر يحمل معلومة جوهرية موثّقة.

سياسة الاستشهاد (صارمة جداً — لمنع الهلوسة):
- يُمنع منعاً باتاً اختراع أي مصدر أو مؤلف أو رابط.
- يُمنع الاستشهاد بمقالات ويب عامة، مدوّنات، ويكيبيديا، مواقع إخبارية، أو روابط مولّدة.
- المصادر المقبولة **فقط**: كتب أكاديمية محكّمة، مجلات علمية محكّمة (Journals)، أو رسائل/أطاريح جامعية (Theses/Dissertations) — معروفة بمؤلفها ودار نشرها/جامعتها وسنتها.
- إن لم تكن متيقّناً 100% من وجود مصدر أكاديمي محكّم قابل للتحقق، اضبط "verifiable": false واترك حقول المصدر فارغة تماماً ("") ولا تضع أي رابط.
- لا تضع حقل url إلا إذا كان رابطاً أكاديمياً حقيقياً معروفاً (JSTOR، Oxford Academic، Cambridge Core، Brill، dar.aucegypt، QDL، The National Archives UK). خلاف ذلك اتركه "".

أعد JSON خالصاً فقط بدون code fences:
{
  "name": "${q}",
  "definition": "تعريف من ثمانية أسطر بالعربية الفصحى، دقيق أكاديمياً، يربط الكيان بسياق الخليج العربي 1939-1945 إن أمكن",
  "verifiable": true_or_false,
  "sourceType": "book" | "journal" | "thesis" | "",
  "source": {
    "title": "",
    "author": "",
    "publisher": "",
    "year": "",
    "url": ""
  }
}`
        }]
      });
      const text = data.content?.map(c=>c.text||"").join("") || "{}";
      const clean = text.replace(/```json|```/g,"").trim();
      const m = clean.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : clean);
      // فلترة صارمة: نقبل فقط book/journal/thesis مع مؤلف وعنوان، وإلا نُسقط المصدر كلياً
      const st = (parsed?.sourceType || "").toLowerCase();
      const hasCore = parsed?.source?.title && parsed?.source?.author;
      const academicType = ["book","journal","thesis"].includes(st);
      if (parsed.verifiable === false || !academicType || !hasCore) {
        parsed.verifiable = false;
        parsed.source = null;
        parsed.sourceType = "";
      }
      setEntityResult(parsed);
    } catch (e) {
      showNotif("⚠️ تعذّر استخراج التعريف — حاول مرة أخرى", "error");
    }
    setEntityLoading(false);
  };

  // محرك البحث في التليغرام (محاكاة ذكية بـ Claude)
  const handleTgSearch = async () => {
    if (!tgQuery.trim()) return;
    setTgLoading(true);
    setTgResults([]);
    try {
      const data = await callLLM({
          max_tokens:1500,
          messages:[{
            role:"user",
            content:`أنت مساعد بحثي لأطروحة دكتوراه: "الخليج العربي خلال الحرب العالمية الثانية 1939-1945".

الباحث يبحث في مجموعات تيليغرام الأرشيفية والتاريخية عن: "${tgQuery}"

بناءً على معرفتك بمصادر هذا الموضوع، اقترح له:
1. ما هي قنوات/مجموعات تيليغرام الموثوقة التي قد تحتوي مصادر تاريخية وأرشيفية مشابهة؟
2. ما هي الوثائق أو المصادر المتوقع وجودها في هذا الموضوع؟
3. ما هي الكلمات المفتاحية الأفضل للبحث؟
4. هل هناك مصادر من QDL أو الأرشيف البريطاني مرتبطة بهذا الموضوع؟

أجب بصيغة JSON فقط:
{
  "channels": [{"name":"اسم القناة/المجموعة","description":"وصف","url":"رابط إن وجد"}],
  "related_docs": [{"title":"عنوان المصدر المتوقع","archiveRef":"IOR/...","relevance":"السبب"}],
  "keywords": ["كلمة1","كلمة2"],
  "qdl_suggestions": ["اقتراح QDL 1","اقتراح QDL 2"]
}`
          }]
        });
      const text = data.content?.map(c=>c.text||"").join("") || "";
      try {
        const clean = text.replace(/```json|```/g,"").trim();
        const parsed = JSON.parse(clean);
        setTgResults(parsed);
      } catch {
        setTgResults({ error: text });
      }
    } catch {
      setTgResults({ error: "حدث خطأ في الاتصال" });
    }
    setTgLoading(false);
  };

  const handleAddDoc = async () => {
    if (!addForm.title) { showNotif("يجب إدخال عنوان الوثيقة","error"); return; }
    // AI classification into the live thesis structure (chapter + section + sub-section)
    let cls = null;
    try {
      showNotif("🤖 جاري تصنيف المصدر داخل هيكل الأطروحة...");
      cls = await classifyToStructure({
        title: addForm.title,
        author: addForm.author,
        sourceType: addForm.sourceType || addForm.category,
        summary: addForm.notes,
        extraContext: [addForm.keywords, addForm.archiveRef].filter(Boolean).join(" | "),
      });
    } catch (e) { console.error("[add-classify]", e); }

    const finalChapterId = cls?.chapterId || (addForm.chapterId ? parseInt(addForm.chapterId) : null);
    const newDoc = {
      ...addForm,
      id: docs.length + 100 + Math.floor(Math.random()*100),
      chapterId: finalChapterId,
      sectionId: cls?.subSectionId || cls?.sectionId || addForm.sectionId || "",
      subSectionId: cls?.subSectionId || null,
      section: addForm.section || cls?.subSectionName || cls?.sectionName || "",
      classificationReason: cls?.classificationReason || "",
      classificationConfidence: cls?.classificationConfidence || "",
      year: addForm.year || null,
      sourceType: addForm.sourceType || addForm.category || "وثيقة أرشيفية",
      category:   addForm.category   || addForm.sourceType || "وثيقة أرشيفية",
    };

    setDocs(prev => [newDoc, ...prev]);
    setAddForm({ title:"",author:"",year:"",archiveRef:"",chapterId:"",section:"",priority:"★★",category:"مصدر أولي",country:"",keywords:"",notes:"",isNew:false,status:"لم يُراجع" });
    showNotif(`✅ تمت الإضافة — ${cls?.sectionName ? "صُنِّف في: " + (cls.subSectionName || cls.sectionName) : "الإجمالي: " + (docs.length + 1)}`);
    setPage("search");
  };

  const handleAI = async (doc) => {
    setAiLoading(true);
    setAiResult("");
    try {
      const data = await callLLM({
          max_tokens:1000,
          messages:[{ role:"user", content:`أنت مساعد بحثي متخصص في "الخليج العربي خلال الحرب العالمية الثانية 1939-1945".

حلّل هذه الوثيقة الأرشيفية:
العنوان: ${doc.title}
الرقم الأرشيفي: ${doc.archiveRef || "—"}
الفصل: ${CHAPTERS_DATA.find(c=>c.id===doc.chapterId)?.titleAr || "—"}
المبحث: ${doc.section || "—"}
الأولوية: ${doc.priority}
ملاحظات: ${doc.notes || "—"}

أعطني:
1. ملخص أكاديمي موجز عن محتوى هذه الوثيقة المتوقع (3-4 أسطر)
2. أهميتها للأطروحة وللمبحث المحدد
3. الأسئلة البحثية التي قد تجيب عنها
4. وثائق أخرى مكملة لها من نفس السلسلة (IOR)
5. كيف تدمجها مع باقي مصادر فصلها

أجب بالعربية بأسلوب أكاديمي مختصر.` }]
        });
      setAiResult(data.content?.map(c=>c.text||"").join("") || "لم يُحصل على رد");
    } catch { setAiResult("خطأ في الاتصال"); }
    setAiLoading(false);
  };

  const handleAISearch = async (q) => {
    if (!q) return;
    setAiLoading(true);
    setAiResult("");
    const docsCtx = combinedDocs.slice(0,30).map(d=>`[${d.id}] ${d.title} | ${d.archiveRef||""} | ف${d.chapterId}`).join("\n");
    try {
      const data = await callLLM({
          max_tokens:1200,
          messages:[{ role:"user", content:`أنت مساعد بحثي لأطروحة "الخليج العربي خلال الحرب العالمية الثانية 1939-1945".
سؤال الباحث: "${q}"
الوثائق المتاحة (${combinedDocs.length} وثيقة):
${docsCtx}
أجب بتحليل أكاديمي، اذكر أرقام الوثائق الأكثر صلة، واقترح خطوات بحثية. أجب بالعربية.` }]
        });
      setAiResult(data.content?.map(c=>c.text||"").join("") || "");
    } catch { setAiResult("خطأ في الاتصال"); }
    setAiLoading(false);
  };

  const saveCustomFormat = () => {
    if (!customFmtForm.name.trim()) { showNotif("أدخل اسم الصيغة","error"); return; }
    let updated;
    if (editingCustomFmt !== null) {
      updated = customFormats.map((f,i) => i===editingCustomFmt ? {...customFmtForm} : f);
      showNotif(`✅ تم تحديث الصيغة: ${customFmtForm.name}`);
    } else {
      if (customFormats.find(f=>f.name===customFmtForm.name)) { showNotif("يوجد صيغة بنفس الاسم","error"); return; }
      updated = [...customFormats, {...customFmtForm}];
      showNotif(`✅ تم حفظ الصيغة: ${customFmtForm.name}`);
    }
    setCustomFormats(updated);
    try { localStorage.setItem("acadarchiv_custom_formats", JSON.stringify(updated)); } catch {}
    setEditingCustomFmt(null);
    setShowCustomBuilder(false);
    setCustomFmtForm({ name:"", templates:{
      "كتاب":"{المؤلف}. {العنوان}. {مكان_النشر}: {الناشر}، {السنة}م.",
      "وثيقة أرشيفية":"{المؤلف}. {العنوان}. {الرقم_الأرشيفي}، {السنة}م.",
      "رسالة علمية":"{المؤلف}. {العنوان}. رسالة {الدرجة}، {الجامعة}، {السنة}م.",
      "مقالة":"{المؤلف}. \"{العنوان}\". {اسم_المجلة}، م{المجلد}، ع{العدد} ({السنة})، ص{الصفحات}.",
      "صحيفة":"{المؤلف}. \"{العنوان}\". {اسم_الصحيفة}، {التاريخ}.",
      "موقع إلكتروني":"{المؤلف}. {العنوان}. متاح على: {الرابط}، تاريخ الزيارة: {تاريخ_الزيارة}.",
      "تقرير":"{المؤلف}. {العنوان}. {الجهة}، {السنة}م.",
      "أطروحة دكتوراه":"{المؤلف}. {العنوان}. أطروحة دكتوراه، {الجامعة}، {السنة}م.",
    }});
  };

  const deleteCustomFormat = (i) => {
    const updated = customFormats.filter((_,idx)=>idx!==i);
    setCustomFormats(updated);
    try { localStorage.setItem("acadarchiv_custom_formats", JSON.stringify(updated)); } catch {}
    if (exportFormat === `custom_${i}`) setExportFormat("Chicago");
    showNotif("🗑️ تم حذف الصيغة");
  };

  const applyCustomTemplate = (tmpl, doc) => tmpl
    .replace(/{المؤلف}/g, doc.author||"أرشيف مكتب الهند")
    .replace(/{العنوان}/g, doc.title||"")
    .replace(/{السنة}/g, doc.year||"د.ت")
    .replace(/{الرقم_الأرشيفي}/g, doc.archiveRef||"")
    .replace(/{النوع}/g, doc.category||"")
    .replace(/{الفصل}/g, CHAPTERS_DATA.find(c=>c.id===doc.chapterId)?.titleAr||"")
    .replace(/{الملاحظات}/g, doc.notes||"")
    .replace(/{الناشر}/g, doc.publisher||"[الناشر]")
    .replace(/{مكان_النشر}/g, doc.place||"[مكان النشر]")
    .replace(/{الجامعة}/g, doc.university||"[الجامعة]")
    .replace(/{الدرجة}/g, doc.degree||"[الدرجة]")
    .replace(/{اسم_المجلة}/g, doc.journal||"[اسم المجلة]")
    .replace(/{المجلد}/g, doc.volume||"[م]")
    .replace(/{العدد}/g, doc.issue||"[ع]")
    .replace(/{الصفحات}/g, doc.pages||"[ص]")
    .replace(/{اسم_الصحيفة}/g, doc.newspaper||"[الصحيفة]")
    .replace(/{التاريخ}/g, doc.date||doc.year||"[التاريخ]")
    .replace(/{الرابط}/g, doc.url||"[الرابط]")
    .replace(/{تاريخ_الزيارة}/g, doc.accessDate||"[تاريخ الزيارة]")
    .replace(/{الجهة}/g, doc.institution||"[الجهة]");

  const handleExport = () => {
    if (!exportSelected.length) { showNotif("اختر وثيقة واحدة على الأقل","error"); return; }
    const sel = combinedDocs.filter(d=>exportSelected.includes(d.id));
    let text;
    if (exportFormat.startsWith("custom_")) {
      const idx = parseInt(exportFormat.replace("custom_",""));
      const fmt = customFormats[idx];
      text = sel.map(d => {
        const docType = d.category || "وثيقة أرشيفية";
        const tmpl = fmt.templates[docType] || fmt.templates["وثيقة أرشيفية"] || Object.values(fmt.templates)[0] || "{المؤلف}. {العنوان}. {السنة}.";
        return applyCustomTemplate(tmpl, d);
      }).join("\n\n");
    } else {
      text = sel.map(d=>genRef(d,exportFormat)).join("\n\n");
    }
    setExportText(text);
    showNotif(`✅ تم توليد ${sel.length} مرجع`);
  };


  // ===================================================================
  // الميزة أ: نظام بطاقات وجذاذات البحث الآلي (Smart Indexing Cards)
  // ===================================================================
  const [cards, setCards] = useState(() => {
    try {
      const v = localStorage.getItem("acadarchiv_cards"); return v && v !== "undefined" ? JSON.parse(v) : [];
    } catch { return []; }
  });
  const [cardView, setCardView]           = useState("grid");    // "grid" | "detail"
  const [selectedCard, setSelectedCard]   = useState(null);
  const [cardForm, setCardForm]           = useState({
    title: "", topic: "", date: "", chapterId: "", sectionId: "", tags: "", notes: ""
  });
  const [showCardForm, setShowCardForm]   = useState(false);
  const [cardAiLoading, setCardAiLoading] = useState(false);
  const [cardAiResult, setCardAiResult]   = useState("");
  const [cardFilterCh, setCardFilterCh]   = useState("");
  const [cardSearchQ, setCardSearchQ]     = useState("");

  const saveCards = (updated) => {
    setCards(updated);
    try { localStorage.setItem("acadarchiv_cards", JSON.stringify(updated)); } catch {}
  };

  // توليد بطاقة ذكية بمساعدة الذكاء الاصطناعي
  const generateSmartCard = async () => {
    if (!cardForm.title.trim()) { showNotif("أدخل عنوان البطاقة أولاً", "error"); return; }
    setCardAiLoading(true);
    setCardAiResult("");

    const relatedDocs = docs.filter(d => {
      if (cardForm.chapterId && d.chapterId !== parseInt(cardForm.chapterId)) return false;
      const q = cardForm.topic.toLowerCase();
      return !q || d.title.toLowerCase().includes(q) || (d.notes||"").toLowerCase().includes(q) || (d.section||"").toLowerCase().includes(q);
    }).slice(0, 12);

    const docsContext = relatedDocs.map(d =>
      `[${d.id}] "${d.title}" — ${d.archiveRef||""} — ${d.section||""} — ${d.notes||""}`
    ).join("\n");

    const chapName = chapters.find(c => c.id === parseInt(cardForm.chapterId))?.titleAr || "كل الفصول";
    const prompt = `أنت مؤرخ أكاديمي متخصص في تاريخ "الخليج العربي خلال الحرب العالمية الثانية 1939-1945".

عنوان الجذاذة/البطاقة: "${cardForm.title}"
الموضوع: ${cardForm.topic || "—"}
التاريخ/الحقبة: ${cardForm.date || "—"}
الفصل المرتبط: ${chapName}
وسوم التصنيف: ${cardForm.tags || "—"}

المصادر المرتبطة من الأرشيف (${relatedDocs.length} مصدر):
${docsContext || "لم يُعثر على مصادر مطابقة"}

المطلوب: اصنع لي "بطاقة بحثية أكاديمية" متكاملة تتضمن:

1. **السياق التاريخي**: فقرة تحليلية (4-6 أسطر) توضح السياق التاريخي لهذا الحدث/الموضوع في إطار أطروحة الخليج والحرب العالمية الثانية.

2. **الاقتباسات والشواهد المرجعية**: استخرج أو اقترح الأفكار المحورية الموثقة في المصادر المذكورة أعلاه التي تصب في هذا الموضوع (3-5 نقاط).

3. **الصلة بالفصول**: حدد أي الفصول والمباحث يخدمها هذا الموضوع وكيف.

4. **أسئلة بحثية**: 3 أسئلة تحليلية يمكن للباحث طرحها عند صياغة هذا المحور.

5. **مصادر مقترحة إضافية**: اقترح مصادر إضافية (IOR أو غيرها) يمكن البحث عنها في QDL.

أجب بالعربية الأكاديمية الرصينة.`;

    try {
      const data = await callLLM({
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }]
        });
      const text = data.content?.map(c => c.text || "").join("") || "لم يُحصل على رد";
      setCardAiResult(text);
    } catch {
      setCardAiResult("خطأ في الاتصال — تأكد من الإنترنت وحاول مجدداً");
    }
    setCardAiLoading(false);
  };

  const saveCard = () => {
    if (!cardForm.title.trim()) { showNotif("أدخل عنوان البطاقة", "error"); return; }
    const relatedDocs = docs.filter(d => {
      if (cardForm.chapterId && d.chapterId !== parseInt(cardForm.chapterId)) return false;
      const q = cardForm.topic.toLowerCase();
      return !q || d.title.toLowerCase().includes(q) || (d.notes||"").toLowerCase().includes(q);
    }).slice(0, 8).map(d => d.id);

    const newCard = {
      id:          Date.now() + Math.random(),
      title:       cardForm.title,
      topic:       cardForm.topic,
      date:        cardForm.date,
      chapterId:   cardForm.chapterId ? parseInt(cardForm.chapterId) : null,
      sectionId:   cardForm.sectionId || null,
      tags:        cardForm.tags.split("،").map(t => t.trim()).filter(Boolean),
      notes:       cardForm.notes,
      aiContent:   cardAiResult,
      relatedDocIds: relatedDocs,
      createdAt:   new Date().toLocaleDateString("ar-IQ"),
    };
    saveCards([newCard, ...cards]);
    setCardForm({ title:"", topic:"", date:"", chapterId:"", sectionId:"", tags:"", notes:"" });
    setCardAiResult("");
    setShowCardForm(false);
    showNotif("✅ تم حفظ البطاقة البحثية");
  };

  const deleteCard = (id) => {
    saveCards(cards.filter(c => c.id !== id));
    if (selectedCard?.id === id) { setSelectedCard(null); setCardView("grid"); }
    showNotif("🗑️ تم حذف البطاقة");
  };

  const filteredCards = cards.filter(c => {
    if (cardFilterCh && c.chapterId !== parseInt(cardFilterCh)) return false;
    if (cardSearchQ) {
      const q = cardSearchQ.toLowerCase();
      return c.title.toLowerCase().includes(q) ||
             (c.topic||"").toLowerCase().includes(q) ||
             (c.tags||[]).join(" ").toLowerCase().includes(q);
    }
    return true;
  });

  // ===================================================================
  // الميزة ب: بوابة الترجمة وتكشيف المصادر الأجنبية
  // ===================================================================
  const [translatorText, setTranslatorText]           = useState("");
  const [translatorFile, setTranslatorFile]           = useState(null);
  const [translatorFileName, setTranslatorFileName]   = useState("");
  const [translatedResult, setTranslatedResult]       = useState("");
  const [keyPoints, setKeyPoints]                     = useState([]);
  const [translatorLoading, setTranslatorLoading]     = useState(false);
  const [translatorLang, setTranslatorLang]           = useState("إنجليزية");
  const [translatorDocMeta, setTranslatorDocMeta]     = useState(null);
  const [savedTranslations, setSavedTranslations]     = useState(() => {
    try { const v = localStorage.getItem("acadarchiv_translations"); return v && v !== "undefined" ? JSON.parse(v) : []; } catch { return []; }
  });
  const [selectedTranslation, setSelectedTranslation] = useState(null);
  const translatorFileRef = useRef(null);

  const saveTranslations = (updated) => {
    setSavedTranslations(updated);
    try { localStorage.setItem("acadarchiv_translations", JSON.stringify(updated)); } catch {}
  };

  // Phase 3c: debounced cloud sync for bibliography / cards / translations / custom_formats
  React.useEffect(() => { if (bibHydratedRef.current)   syncBibDebounced(bibliography);     }, [bibliography, syncBibDebounced]);
  React.useEffect(() => { if (cardsHydratedRef.current) syncCardsDebounced(cards);          }, [cards, syncCardsDebounced]);
  React.useEffect(() => { if (trHydratedRef.current)    syncTrDebounced(savedTranslations); }, [savedTranslations, syncTrDebounced]);
  React.useEffect(() => { if (fmtHydratedRef.current)   syncFmtDebounced(customFormats);    }, [customFormats, syncFmtDebounced]);


  const runImageOcrTranslation = async (imageDataUrls) => {
    setTranslatorLoading(true);
    setTranslatedResult("");
    setKeyPoints([]);
    setTranslatorDocMeta(null);
    const prompt = `أنت أرشيفي متخصص في وثائق مكتب الهند البريطاني (IOR) المتعلقة بالخليج العربي خلال الحرب العالمية الثانية 1939-1945.
هذه صور لوثيقة أرشيفية ممسوحة ضوئياً.
المطلوب:
1. قراءة كل النص الظاهر في الصور (OCR كامل بلغة الأصل)
2. ترجمة النص الكامل إلى عربية أكاديمية رصينة
3. استخراج 5 نقاط جوهرية مهمة لأطروحة دكتوراه عن الخليج العربي في الحرب العالمية الثانية
4. اقتراح الفصل الأنسب:
   - الفصل 1: أوضاع الخليج قبل الحرب
   - الفصل 2: الأهمية الاستراتيجية والعسكرية
   - الفصل 3: التحولات السياسية
   - الفصل 4: التحولات الاقتصادية

أجب بـ JSON فقط:
{
  "ocrText": "النص الكامل المستخرج بلغته الأصلية",
  "docMeta": {"estimatedTitle":"","author":"","date":"","docType":"","language":"إنجليزية","suggestedChapter":""},
  "translation": "الترجمة العربية الكاملة",
  "keyPoints": [
    {"rank":1,"point":"","chapter":"","importance":"★★★"},
    {"rank":2,"point":"","chapter":"","importance":"★★★"},
    {"rank":3,"point":"","chapter":"","importance":"★★"},
    {"rank":4,"point":"","chapter":"","importance":"★★"},
    {"rank":5,"point":"","chapter":"","importance":"★"}
  ]
}`;
    try {
      const content = [{ type: "text", text: prompt }];
      for (const url of imageDataUrls) {
        content.push({ type: "image_url", image_url: { url } });
      }
      const data = await callLLM({
        forceProvider: "lovable",
        max_tokens: 3000,
        messages: [{ role: "user", content }],
      });
      const raw = data.content?.map(c => c.text || "").join("") || "{}";
      const clean = raw.replace(/```json|```/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
      if (parsed.ocrText) setTranslatorText(parsed.ocrText);
      setTranslatedResult(parsed.translation || "لم يتم الحصول على الترجمة");
      setKeyPoints(parsed.keyPoints || []);
      setTranslatorDocMeta(parsed.docMeta || null);
      showNotif("✅ تم استخراج النص والترجمة");
    } catch {
      showNotif("فشل تحليل الصورة — حاول مرة أخرى", "error");
    }
    setTranslatorLoading(false);
  };

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const extractPdfPages = async (file) => {
    const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(it => it.str).join(" ") + "\n";
    }
    const images = [];
    const maxPages = Math.min(pdf.numPages, 5);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      images.push(canvas.toDataURL("image/jpeg", 0.85));
    }
    return { text: text.trim(), images };
  };

  const handleTranslatorFileUpload = async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    const allowed = ["txt", "md", "pdf", "jpg", "jpeg", "png", "webp"];
    if (!allowed.includes(ext)) {
      showNotif("ارفع TXT أو MD أو PDF أو صورة (JPG/PNG/WEBP)", "warn");
      return;
    }
    setTranslatorFileName(file.name);
    setTranslatorFile(file);

    if (["txt", "md"].includes(ext)) {
      const reader = new FileReader();
      reader.onload = e => {
        setTranslatorText(e.target.result);
        showNotif(`✅ تم تحميل: ${file.name}`);
      };
      reader.readAsText(file, "utf-8");
      return;
    }

    if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
      showNotif("⏳ جاري قراءة الصورة وترجمتها...");
      try {
        const dataUrl = await fileToDataUrl(file);
        await runImageOcrTranslation([dataUrl]);
      } catch {
        showNotif("فشل قراءة الصورة", "error");
      }
      return;
    }

    if (ext === "pdf") {
      showNotif("⏳ جاري معالجة PDF...");
      try {
        const { text, images } = await extractPdfPages(file);
        if (text && text.length >= 100) {
          setTranslatorText(text);
          showNotif("✅ تم استخراج نص PDF — اضغط زر الترجمة");
        } else {
          showNotif("PDF ممسوح ضوئياً — جاري OCR عبر الذكاء الاصطناعي...");
          await runImageOcrTranslation(images);
        }
      } catch {
        showNotif("فشل قراءة ملف PDF", "error");
      }
      return;
    }
  };

  const runTranslation = async () => {
    const textToTranslate = translatorText.trim();
    if (!textToTranslate) { showNotif("أدخل أو ألصق النص الأجنبي أولاً", "error"); return; }
    setTranslatorLoading(true);
    setTranslatedResult("");
    setKeyPoints([]);
    setTranslatorDocMeta(null);

    const prompt = `أنت مترجم ومؤرخ أكاديمي متخصص في وثائق الأرشيف البريطاني (مكتب الهند) والأمريكي المتعلقة بالخليج العربي في الحرب العالمية الثانية 1939-1945.

المهمة: ترجمة وتحليل الوثيقة/النص التالي (${translatorLang}) إلى العربية.

النص الأصلي:
"""
${textToTranslate.substring(0, 4000)}
"""

أجب بـ JSON فقط بدون أي نص خارجه:
{
  "docMeta": {
    "estimatedTitle": "العنوان المستنتج من المحتوى",
    "author": "المؤلف أو الجهة إن وُجد",
    "date": "التاريخ إن وُجد",
    "docType": "نوع الوثيقة (تقرير/مراسلة/تعليمات/...)",
    "language": "${translatorLang}",
    "suggestedChapter": "اسم الفصل الأنسب"
  },
  "translation": "الترجمة العربية الكاملة بلغة تاريخية رصينة، محافظاً على أسماء الأعلام والأماكن والمصطلحات التاريخية الدقيقة",
  "keyPoints": [
    {"rank": 1, "point": "النقطة الجوهرية الأولى", "chapter": "الفصل المرتبط", "importance": "★★★"},
    {"rank": 2, "point": "النقطة الجوهرية الثانية", "chapter": "الفصل المرتبط", "importance": "★★★"},
    {"rank": 3, "point": "النقطة الجوهرية الثالثة", "chapter": "الفصل المرتبط", "importance": "★★"},
    {"rank": 4, "point": "النقطة الرابعة", "chapter": "الفصل المرتبط", "importance": "★★"},
    {"rank": 5, "point": "النقطة الخامسة", "chapter": "الفصل المرتبط", "importance": "★"}
  ]
}`;

    try {
      const data = await callLLM({
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }]
        });
      const raw = data.content?.map(c => c.text || "").join("") || "{}";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setTranslatedResult(parsed.translation || "لم يتم الحصول على الترجمة");
      setKeyPoints(parsed.keyPoints || []);
      setTranslatorDocMeta(parsed.docMeta || null);
    } catch {
      setTranslatedResult("حدث خطأ في الترجمة — تأكد من الاتصال بالإنترنت");
      setKeyPoints([]);
    }
    setTranslatorLoading(false);
  };

  const saveTranslation = () => {
    if (!translatedResult) { showNotif("لا يوجد محتوى للحفظ", "error"); return; }
    const entry = {
      id:           Date.now() + Math.random(),
      fileName:     translatorFileName || "نص ملصوق",
      originalText: translatorText.substring(0, 500),
      translation:  translatedResult,
      keyPoints,
      docMeta:      translatorDocMeta,
      savedAt:      new Date().toLocaleDateString("ar-IQ"),
    };
    saveTranslations([entry, ...savedTranslations]);
    showNotif("✅ تم حفظ الترجمة في السجل");
  };

  const deleteTranslation = (id) => {
    saveTranslations(savedTranslations.filter(t => t.id !== id));
    if (selectedTranslation?.id === id) setSelectedTranslation(null);
    showNotif("🗑️ تم حذف الترجمة");
  };

  const pColor = p => p==="★★★"?"#16a34a":p==="★★"?"#ca8a04":"#94a3b8";
  const pBg   = p => p==="★★★"?"#dcfce7":p==="★★"?"#fef9c3":"#f1f5f9";

  // ===================================================================
  // الميزة 1: شريط نسب الإنجاز (Thesis Progress Tracker)
  // ===================================================================

  // حساب نسبة إنجاز كل فصل: يحسب عدد الوثائق + الهوامش المنجزة
  const calcChapterProgress = (chapterId) => {
    const chDocs   = combinedDocs.filter(d => d.chapterId === chapterId);
    const chBibs   = bibliography.filter(b => {
      const doc = combinedDocs.find(d => d.id === b.docId);
      return doc?.chapterId === chapterId;
    });
    // نسبة وجود وثائق: نحتاج 10 وثائق كحد مثالي لكل فصل
    const docScore = Math.min(chDocs.length / 10, 1) * 60;
    // نسبة الهوامش المُستخرجة: نحتاج 5 هوامش كحد مثالي
    const bibScore = Math.min(chBibs.length / 5, 1) * 40;
    return Math.round(docScore + bibScore);
  };

  const calcOverallProgress = () => {
    const scores = [1, 2, 3, 4].map(id => calcChapterProgress(id));
    return Math.round(scores.reduce((a, b) => a + b, 0) / 4);
  };

  // ===================================================================
  // الميزة 2: مؤشر تنوع الأوزان العلمية (Source Diversity Metrics)
  // ===================================================================

  // تصنيف فئات المصادر للتنوع العلمي
  const DIVERSITY_CATEGORIES = [
    { key: "archival",  label: "الوثائق والمصادر الأولية", color: "#8B5CF6", cats: ["مصدر أولي","وثيقة أرشيفية","تقرير رسمي","تقرير"] },
    { key: "books",     label: "الكتب",                     color: "#3B82F6", cats: ["كتاب","كتاب عربي","كتاب أجنبي"] },
    { key: "theses",    label: "الرسائل والأطاريح",         color: "#10B981", cats: ["رسالة علمية","رسالة ماجستير","أطروحة دكتوراه"] },
    { key: "journals",  label: "البحوث والمجلات",            color: "#F59E0B", cats: ["مقالة","بحث","بحث علمي","مجلة علمية"] },
    { key: "confs",     label: "المؤتمرات",                  color: "#06B6D4", cats: ["مؤتمر علمي","مؤتمر"] },
    { key: "news",      label: "الصحف",                      color: "#EF4444", cats: ["صحيفة"] },
    { key: "web",       label: "المواقع والموسوعات",         color: "#0EA5E9", cats: ["موقع إلكتروني","موسوعة"] },
  ];


  const calcDiversityForChapter = (chapterId) => {
    const chDocs = combinedDocs.filter(d => d.chapterId === chapterId);
    const total  = chDocs.length || 1;
    return DIVERSITY_CATEGORIES.map(dc => {
      const count = chDocs.filter(d => dc.cats.includes(d.category || "مصدر أولي")).length;
      return { ...dc, count, pct: Math.round((count / total) * 100) };
    }).filter(dc => dc.count > 0);
  };

  const calcDiversityForSection = (sectionId) => {
    const secDocs = combinedDocs.filter(d => d.sectionId === sectionId || d.sectionId?.startsWith(sectionId));
    const total   = secDocs.length || 1;
    return DIVERSITY_CATEGORIES.map(dc => {
      const count = secDocs.filter(d => dc.cats.includes(d.category || "مصدر أولي")).length;
      return { ...dc, count, pct: Math.round((count / total) * 100) };
    }).filter(dc => dc.count > 0);
  };

  // ===================================================================
  // الميزة 3: حافز المؤرخ اليومي (The Historian's Fuel)
  // ===================================================================

  const MOTIVATIONAL_QUOTES = [
    "يا دكتور أسعد، كلُّ وثيقةٍ تضيفها اليوم هي لَبِنةٌ راسخةٌ في صرحٍ علميٍّ سيُخلِّد اسمك بين مؤرخي الخليج العربي.",
    "يا دكتور أسعد، مجهودك اليوم يُقرِّبك خطوةً كبرى نحو اللقب الأكاديمي — استمر فأنت على الطريق الصحيح!",
    "يا دكتور أسعد، المؤرخُ الحقيقيُّ لا يخشى عمق الأرشيف، فأنت تُنقِّب في ذاكرة الخليج ما أهمله الآخرون.",
    "يا دكتور أسعد، أطروحتك تُعيدُ اكتشافَ فصلٍ مجهولٍ من تاريخ الخليج — لا يُنجز هذا إلا بالصبر والمثابرة التي أراها فيك.",
    "يا دكتور أسعد، إن وثيقةَ IOR التي تقرأها الآن ظلَّت حبيسةَ الأرشيف أكثر من ثمانين عاماً — أنت مَن يُعطيها صوتاً.",
    "يا دكتور أسعد، كلُّ هامشٍ تكتبه يُرسِّخ أمانةَ التوثيق العلمي — فابقَ شامخاً كالمحرّق التي حرستها قواعد الحلفاء.",
    "يا دكتور أسعد، الأرشيفُ البريطانيُّ فتحَ أبوابه لك — فاستخلص منه ما لم يستخلصه غيرك بعد.",
  ];

  // أحداث تاريخية افتراضية مرتبطة بتاريخ اليوم (شهر/يوم)
  const HISTORICAL_EVENTS = [
    { month:1,  day:15, text:"في مثل هذا اليوم عام 1942م، صدرت تعليمات بريطانية سرية بتعزيز الحراسة على حقول نفط البحرين إثر تقارير عن تحركات غواصات ألمانية في المحيط الهندي." },
    { month:2,  day:10, text:"في مثل هذا اليوم عام 1941م، وصل أول دفعة من الطائرات الأمريكية إلى قاعدة المحرّق الجوية في البحرين ضمن برنامج التعاون الأنجلو-أمريكي." },
    { month:3,  day:20, text:"في مثل هذا اليوم عام 1943م، أجرت القوات البريطانية تدريبات دفاعية في مضيق هرمز استعداداً لأي هجوم بحري محتمل من دول المحور." },
    { month:4,  day:5,  text:"في مثل هذا اليوم عام 1940م، رصد المراقبون البريطانيون في الكويت تحركات مريبة لسفن تجارية لم تُفصح عن هويتها في شمال الخليج." },
    { month:5,  day:12, text:"في مثل هذا اليوم عام 1942م، بدأت شركة بابكو (نفط البحرين) تطبيق خطة الإنكار الطارئة التي تقضي بتدمير المنشآت النفطية عند اقتراب العدو." },
    { month:6,  day:8,  text:"في مثل هذا اليوم عام 1941م، تسلّم الملك عبد العزيز آل سعود تقريراً بريطانياً سرياً حول تطورات الحرب في شمال أفريقيا وانعكاساتها على الخليج." },
    { month:7,  day:22, text:"في مثل هذا اليوم عام 1943م، أفادت التقارير البريطانية بأن إنتاج نفط الكويت والبحرين بلغ ذروته لتلبية الطلب المتصاعد من الحلفاء في الجبهة الأوروبية." },
    { month:8,  day:3,  text:"في مثل هذا اليوم عام 1940م، أصدرت المقيمية البريطانية في بوشهر تعليمات لشيوخ الخليج بتشديد الرقابة على الموانئ لمنع التهريب إلى دول المحور." },
    { month:9,  day:17, text:"في مثل هذا اليوم عام 1941م، أجرت بريطانيا والاتحاد السوفيتي عملية الغزو المشترك لإيران مما ألقى بظلاله الثقيلة على الأوضاع السياسية في الخليج العربي المجاور." },
    { month:10, day:28, text:"في مثل هذا اليوم عام 1942م، وصل إلى البحرين مراقبٌ بحريٌّ أمريكي رفيع المستوى لتقييم الأوضاع الأمنية في الخليج بعد تقارير عن اختراقات استخباراتية." },
    { month:11, day:14, text:"في مثل هذا اليوم عام 1944م، عُقد اجتماع سري في البحرين بين ضباط البحرية البريطانية والأمريكية لمناقشة مستقبل القواعد العسكرية في الخليج بعد الحرب." },
    { month:12, day:7,  text:"في مثل هذا اليوم عام 1941م، هاجمت اليابان ميناء بيرل هاربر؛ الأمر الذي دفع القيادة البريطانية في الخليج إلى رفع درجة الاستعداد القصوى فوراً." },
  ];

  const getTodayHistoricalEvent = () => {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const day   = now.getDate();
    const found = HISTORICAL_EVENTS.find(e => e.month === month && e.day === day);
    if (found) return found.text;
    // أقرب حدث حسب الشهر إذا لم يُوجد تطابق دقيق
    const byMonth = HISTORICAL_EVENTS.filter(e => e.month === month);
    return byMonth.length > 0
      ? byMonth[Math.floor(Math.random() * byMonth.length)].text
      : HISTORICAL_EVENTS[Math.floor(Math.random() * HISTORICAL_EVENTS.length)].text;
  };

  const [dailyQuoteIdx, setDailyQuoteIdx] = useState(() => new Date().getDate() % MOTIVATIONAL_QUOTES.length);
  const [historicalEvent]                 = useState(getTodayHistoricalEvent);
  const [fuelCardExpanded, setFuelCardExpanded] = useState(true);

  // ===================================================================
  // الميزة 4: محاكي مناقشة الأطروحة (AI Thesis Defense Simulator)
  // ===================================================================
  const [defenseMessages, setDefenseMessages] = useState([]);
  const [defenseInput, setDefenseInput]       = useState("");
  const [defenseLoading, setDefenseLoading]   = useState(false);
  const [defenseActive, setDefenseActive]     = useState(false);
  const [defenseChapter, setDefenseChapter]   = useState(null);
  const defenseChatEndRef = useRef(null);

  // بدء جلسة المناقشة
  const startDefenseSession = async (ch) => {
    setDefenseChapter(ch);
    setDefenseActive(true);
    setDefenseMessages([]);
    setDefenseLoading(true);

    const chDocs     = combinedDocs.filter(d => d.chapterId === ch.id);
    const diversity  = calcDiversityForChapter(ch.id);
    const diversityText = diversity.map(d => `${d.label}: ${d.count} مصدر (${d.pct}%)`).join("، ");
    const docsContext = chDocs.slice(0, 15).map(d => `• "${d.title}" [${d.archiveRef||"—"}]`).join("\n");

    const systemPrompt = `أنت أستاذ دكتور متخصص في التاريخ الحديث، وتؤدي دور رئيس لجنة مناقشة أطروحة دكتوراه بجامعة الموصل. أسلوبك علمي صارم ورصين، تطرح أسئلة نقدية ذكية ومباشرة. لا تُجامل ولا تُهادن، لكنك منصف وبنّاء.

الأطروحة: "الخليج العربي في سنوات الحرب العالمية الثانية 1939-1945"
الطالب: اسعد حامد اسعد النعيمي — جامعة الموصل
الفصل المُناقَش: ${ch.titleAr}

المصادر المُعتمدة في هذا الفصل (${chDocs.length} مصدر):
${docsContext}

توزيع أنواع المصادر: ${diversityText || "لم تُحدد بعد"}

ابدأ المناقشة بسؤال افتتاحي واحد محدد ومركَّز يتعلق بالفصل المذكور ومصادره. اجعل سؤالك يعكس ملاحظة دقيقة من قراءة المصادر الواردة. أجب دائماً بالعربية الفصحى الأكاديمية.`;

    try {
      const data = await callLLM({
          max_tokens: 600,
          system:     systemPrompt,
          messages:   [{ role: "user", content: "ابدأ المناقشة" }]
        });
      const text = data.content?.map(c => c.text || "").join("") || "حدث خطأ في بدء الجلسة.";
      setDefenseMessages([{ role: "committee", text, ts: new Date().toLocaleTimeString("ar") }]);
    } catch {
      setDefenseMessages([{ role: "committee", text: "تعذّر الاتصال بنظام المحاكاة — تأكد من الاتصال بالإنترنت.", ts: new Date().toLocaleTimeString("ar") }]);
    }
    setDefenseLoading(false);
  };

  // إرسال إجابة الطالب
  const sendDefenseReply = async () => {
    if (!defenseInput.trim() || defenseLoading) return;
    const userMsg = { role: "student", text: defenseInput.trim(), ts: new Date().toLocaleTimeString("ar") };
    const newMsgs = [...defenseMessages, userMsg];
    setDefenseMessages(newMsgs);
    setDefenseInput("");
    setDefenseLoading(true);

    const chDocs     = combinedDocs.filter(d => d.chapterId === defenseChapter?.id);
    const diversity  = calcDiversityForChapter(defenseChapter?.id);
    const diversityText = diversity.map(d => `${d.label}: ${d.count} مصدر (${d.pct}%)`).join("، ");

    const systemPrompt = `أنت رئيس لجنة مناقشة أطروحة دكتوراه صارم وعالم. الأطروحة: "الخليج العربي في سنوات الحرب العالمية الثانية 1939-1945". الفصل: ${defenseChapter?.titleAr}. المصادر: ${chDocs.length} مصدر. توزيعها: ${diversityText}. بعد كل إجابة من الطالب، علِّق عليها بجملتين علميتين ثم اطرح سؤالاً نقدياً جديداً ذكياً يتعمق في الموضوع أو يكشف ثغرة محتملة. أسلوبك رصين وصارم وبنّاء. أجب بالعربية الفصحى الأكاديمية دائماً. لا تطل الردود: رد + سؤال واحد فقط.`;

    const apiMessages = newMsgs.map(m => ({
      role:    m.role === "student" ? "user" : "assistant",
      content: m.text,
    }));

    try {
      const data = await callLLM({
          max_tokens: 500,
          system:     systemPrompt,
          messages:   apiMessages,
        });
      const text = data.content?.map(c => c.text || "").join("") || "حدث خطأ.";
      setDefenseMessages(prev => [...prev, { role: "committee", text, ts: new Date().toLocaleTimeString("ar") }]);
    } catch {
      setDefenseMessages(prev => [...prev, { role: "committee", text: "تعذّر الاتصال — حاول مرة أخرى.", ts: new Date().toLocaleTimeString("ar") }]);
    }
    setDefenseLoading(false);
    setTimeout(() => defenseChatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const endDefenseSession = () => {
    setDefenseActive(false);
    setDefenseChapter(null);
    setDefenseMessages([]);
    setDefenseInput("");
  };

  // ===================================================================
  // قاموس المؤرخ للمرادفات والسبك (Historian's Thesaurus)
  // ===================================================================

  // الخيار 1: مستكشف المرادفات الأكاديمية
  const [thesWordInput,    setThesWordInput]    = useState("");
  const [thesWordResult,   setThesWordResult]   = useState(null);   // { word, synonyms:[{word,context,example}], category }
  const [thesWordLoading,  setThesWordLoading]  = useState(false);
  const [thesWordHistory,  setThesWordHistory]  = useState([]);     // آخر الكلمات المبحوثة

  // الخيار 2: ترقية التراكيب القصيرة
  const [thesPhrase,       setThesPhrase]       = useState("");
  const [thesPhraseResult, setThesPhraseResult] = useState(null);   // { original, upgrades:[{text,style,note}] }
  const [thesPhraseLoading,setThesPhraseLoading]= useState(false);
  const [thesPhraseHistory,setThesPhraseHistory]= useState([]);

  // خيار نشط: "synonyms" | "upgrade"
  const [thesActiveTab,    setThesActiveTab]    = useState("synonyms");

  // ===== دالة 1: البحث عن المرادفات =====
  const runThesaurusSearch = async () => {
    const word = thesWordInput.trim();
    if (!word) { showNotif("أدخل كلمة للبحث عن مرادفاتها", "error"); return; }
    setThesWordLoading(true);
    setThesWordResult(null);

    const prompt = `أنت معجم لغوي أكاديمي متخصص في اللغة العربية الفصحى والكتابة التاريخية الأكاديمية.

الكلمة المطلوب إيجاد مرادفاتها: "${word}"

السياق: هذه الكلمة تُستخدم في كتابة أطروحة دكتوراه بعنوان "الخليج العربي في سنوات الحرب العالمية الثانية 1939-1945".

المطلوب: قدّم 8 مرادفات أكاديمية فصيحة متنوعة، مراعياً تنوع السياقات الأكاديمية (سياسي، اقتصادي، عسكري، تاريخي).

أجب بـ JSON فقط بدون أي نص خارجه:
{
  "word": "${word}",
  "category": "الفئة الصرفية (فعل/اسم/صفة)",
  "semanticField": "الحقل الدلالي الرئيسي للكلمة",
  "synonyms": [
    {
      "word": "المرادف الأول",
      "formType": "ماضٍ/مضارع/مصدر/صفة",
      "register": "رسمي/تاريخي/أكاديمي/دبلوماسي",
      "context": "السياق الأنسب لاستخدامه (جملة أو وصف قصير)",
      "example": "مثال جملة كاملة بأسلوب أكاديمي تاريخي"
    }
  ],
  "avoidNote": "ملاحظة عن سبب تكرار الكلمة الأصلية وكيفية تفاديه"
}`;

    try {
      const data = await callLLM({
          max_tokens: 1500,
          messages:   [{ role: "user", content: prompt }]
        });
      const raw  = data.content?.map(c => c.text || "").join("") || "{}";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setThesWordResult(parsed);
      setThesWordHistory(prev => [{ word, result: parsed }, ...prev.filter(h => h.word !== word)].slice(0, 8));
    } catch {
      showNotif("حدث خطأ في الاتصال — حاول مجدداً", "error");
    }
    setThesWordLoading(false);
  };

  // ===== دالة 2: ترقية التركيب القصير =====
  const runPhraseUpgrade = async () => {
    const phrase = thesPhrase.trim();
    if (!phrase) { showNotif("أدخل العبارة أو التركيب المراد ترقيته", "error"); return; }
    if (phrase.split(/\s+/).length > 12) { showNotif("الرجاء إدخال عبارة قصيرة (حتى 12 كلمة)", "warn"); return; }
    setThesPhraseLoading(true);
    setThesPhraseResult(null);

    const prompt = `أنت أستاذ في اللغة العربية وأسلوب الكتابة التاريخية الأكاديمية، متخصص في أطاريح الدكتوراه.

العبارة أو التركيب المُدخَل: "${phrase}"
السياق: أطروحة دكتوراه بعنوان "الخليج العربي في سنوات الحرب العالمية الثانية 1939-1945"

المطلوب: أعد صياغة هذه العبارة بأساليب تاريخية أكاديمية رصينة تليق بمستوى الدكتوراه. قدّم 5 صياغات مختلفة تتباين في الأسلوب والتركيب.

أجب بـ JSON فقط بدون أي نص خارجه:
{
  "original": "${phrase}",
  "diagnosis": "تشخيص مختصر لمشكلة الصياغة الأصلية (ركاكة/تبسيط/غموض/...)",
  "upgrades": [
    {
      "text": "الصياغة المُرقَّاة",
      "style": "الأسلوب المُعتمد (وصفي/تحليلي/استنتاجي/علّي/بلاغي)",
      "note": "ملاحظة توضح ما أضافه هذا الأسلوب"
    }
  ],
  "generalTip": "نصيحة عامة للباحث حول كيفية الارتقاء بأسلوبه في هذا السياق التاريخي"
}`;

    try {
      const data = await callLLM({
          max_tokens: 1500,
          messages:   [{ role: "user", content: prompt }]
        });
      const raw  = data.content?.map(c => c.text || "").join("") || "{}";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setThesPhraseResult(parsed);
      setThesPhraseHistory(prev => [{ phrase, result: parsed }, ...prev.filter(h => h.phrase !== phrase)].slice(0, 6));
    } catch {
      showNotif("حدث خطأ في الاتصال — حاول مجدداً", "error");
    }
    setThesPhraseLoading(false);
  };

  const REGISTER_COLOR = {
    "رسمي":      "#3B82F6",
    "تاريخي":    "#8B5CF6",
    "أكاديمي":   "#10B981",
    "دبلوماسي":  "#F59E0B",
    "وصفي":      "#3B82F6",
    "تحليلي":    "#8B5CF6",
    "استنتاجي":  "#10B981",
    "علّي":      "#F59E0B",
    "بلاغي":     "#EF4444",
  };

  const navItems = [
    {id:"home",          label:"الرئيسية",                                       icon:"🏠"},
    {id:"structure",     label:"هيكل الأطروحة",                                   icon:"📖"},
    {id:"search",        label:"الوثائق",                                         icon:"🗂️"},
    {id:"cards",         label:`بطاقات وجذاذات (${cards.length})`,               icon:"🗃️"},
    {id:"translator",    label:"ترجمة الوثائق الأجنبية",                          icon:"🌐"},
    {id:"thesaurus",     label:"قاموس المؤرخ",                                   icon:"📜"},
    {id:"library",       label:`مكتبتي (${library.length})`,                      icon:"📚"},
    {id:"url_import",    label:"استيراد رابط",                                    icon:"🔗"},
    {id:"add",           label:"إضافة",                                           icon:"➕"},
    {id:"export",        label:"تصدير",                                           icon:"📤"},
    {id:"bibliography",  label:`المراجع النهائية (${bibliography.length})`,       icon:"📋"},
    {id:"defense",       label:"محاكي المناقشة",                                  icon:"🎓"},
    {id:"ai",            label:"مساعد ذكي",                                       icon:"🤖"},
    {id:"supervisor",    label:"غرفة المشرف",                                     icon:"👨‍🏫"},
  ];

  return (
    <div style={{fontFamily:"'Segoe UI',Tahoma,Geneva,Verdana,sans-serif",direction:"rtl",minHeight:"100vh",background:"#f1f5f9",color:"#1e293b"}}>
      {accessDenied && (
        <div data-testid="access-denied-banner" style={{position:"fixed",inset:0,zIndex:10001,background:"rgba(15,23,42,0.95)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,direction:"rtl",fontFamily:"'Cairo',sans-serif"}}>
          <div style={{background:"white",borderRadius:14,padding:28,maxWidth:480,width:"100%",textAlign:"center",boxShadow:"0 30px 60px rgba(0,0,0,.4)"}}>
            <div style={{fontSize:40,marginBottom:10}}>🔒</div>
            <div style={{fontSize:18,fontWeight:800,color:"#dc2626",marginBottom:8}}>حساب غير مخوَّل</div>
            <div style={{fontSize:13,color:"#475569",lineHeight:1.8,marginBottom:18}}>
              هذا الأرشيف مقفل على حسابين مُصرَّح بهما فقط (الباحث + المشرف). حسابك الحالي <strong>{userEmail}</strong> غير مُدرج في قائمة الأشخاص المسموح لهم بالوصول.
            </div>
            <button onClick={handleLogout} data-testid="access-denied-logout" style={{padding:"10px 24px",borderRadius:8,background:"#1e3a5f",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:700}}>
              🚪 تسجيل الخروج
            </button>
          </div>
        </div>
      )}
      {notif && <div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:notif.type==="error"?"#fee2e2":notif.type==="warn"?"#fef9c3":"#dcfce7",color:notif.type==="error"?"#dc2626":notif.type==="warn"?"#92400e":"#16a34a",padding:"10px 24px",borderRadius:12,fontWeight:500,fontSize:13,border:`1px solid ${notif.type==="error"?"#fca5a5":notif.type==="warn"?"#fde68a":"#86efac"}`,boxShadow:"0 4px 20px rgba(0,0,0,0.12)"}}>{notif.msg}</div>}

      {confirmDialog && (
        <div onClick={()=>setConfirmDialog(null)} style={{position:"fixed",inset:0,zIndex:10000,background:"rgba(15,23,42,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:14,padding:24,maxWidth:420,width:"100%",direction:"rtl",fontFamily:"inherit",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
            <div style={{fontWeight:700,fontSize:17,color:"#1e293b",marginBottom:10}}>{confirmDialog.title}</div>
            <div style={{fontSize:13,color:"#475569",lineHeight:1.8,marginBottom:20,whiteSpace:"pre-line"}}>{confirmDialog.message}</div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setConfirmDialog(null)} style={{padding:"9px 18px",borderRadius:8,background:"#e2e8f0",color:"#334155",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600}}>إلغاء</button>
              <button onClick={()=>{const fn=confirmDialog.onConfirm;setConfirmDialog(null);if(fn)fn();}} style={{padding:"9px 18px",borderRadius:8,background:"#dc2626",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600}}>نعم، احذف</button>
            </div>
          </div>
        </div>
      )}


      {/* ===== MODAL: توليد الهامش الفوري ===== */}
      {footnoteModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"white",borderRadius:16,padding:24,maxWidth:620,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)",direction:"rtl",maxHeight:"90vh",overflowY:"auto"}}>
            {/* رأس النافذة */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:15,color:"#1e293b"}}>📝 توليد هامش المتن</div>
              <button onClick={()=>setFootnoteModal(null)} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:16,color:"#64748b"}}>✕</button>
            </div>
            {/* معلومات المصدر (للقراءة فقط) */}
            <div style={{background:"#f8fafc",borderRadius:10,padding:12,marginBottom:14,border:"0.5px solid #e2e8f0",fontSize:12,lineHeight:1.9}}>
              <div><strong>العنوان:</strong> {footnoteModal.title || "—"}</div>
              <div><strong>المؤلف:</strong> {footnoteModal.author || "—"}</div>
              <div><strong>النوع:</strong> {footnoteModal.category || footnoteModal.sourceType || "وثيقة أرشيفية"}</div>
            </div>
            {/* حقل رقم الصفحة */}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,color:"#475569",display:"block",marginBottom:6,fontWeight:500}}>رقم الصفحة *</label>
              <input
                ref={footnotePageRef}
                type="text"
                required
                value={footnotePageNum}
                onChange={e=>{ setFootnotePageNum(e.target.value); setFootnoteResult(""); }}
                onKeyDown={e=>{ if(e.key==="Enter") handleGenerateFootnote(); }}
                aria-label="Page Number"
                placeholder="مثال: 45 أو 45-47"
                style={{width:"100%",padding:"10px 14px",borderRadius:8,border:`1.5px solid ${footnotePageNum.trim()?"#86efac":"#fca5a5"}`,fontSize:14,fontFamily:"inherit",boxSizing:"border-box",outline:"none"}}
              />
              {!footnotePageNum.trim() && (
                <div style={{fontSize:11,color:"#dc2626",marginTop:4}}>⚠️ يجب إدخال رقم الصفحة قبل توليد الهامش</div>
              )}
            </div>
            {/* زر توليد الهامش */}
            <button
              onClick={handleGenerateFootnote}
              disabled={!footnotePageNum.trim()}
              style={{width:"100%",padding:"10px",borderRadius:8,background:footnotePageNum.trim()?"#3B82F6":"#cbd5e1",color:"white",border:"none",cursor:footnotePageNum.trim()?"pointer":"not-allowed",fontWeight:700,fontFamily:"inherit",fontSize:13,marginBottom:14}}>
              توليد الهامش
            </button>
            {/* الهامش المُولَّد (قابل للتعديل) */}
            {footnoteResult && (
              <div style={{marginBottom:12}}>
                <label style={{fontSize:12,color:"#475569",display:"block",marginBottom:6,fontWeight:500}}>الهامش المُولَّد (يمكن التعديل)</label>
                <textarea
                  value={footnoteResult}
                  onChange={e=>setFootnoteResult(e.target.value)}
                  rows={5}
                  style={{width:"100%",padding:10,borderRadius:8,border:"1px solid #cbd5e1",fontSize:13,fontFamily:"inherit",boxSizing:"border-box",direction:"rtl",lineHeight:1.8,resize:"vertical"}}
                />
              </div>
            )}
            {/* أزرار النسخ والإغلاق */}
            <div style={{display:"flex",gap:8}}>
              <button
                onClick={copyFootnoteAndRegister}
                disabled={!footnoteResult.trim()}
                style={{flex:1,padding:"10px",borderRadius:8,background:footnoteResult.trim()?"#10B981":"#cbd5e1",color:"white",border:"none",cursor:footnoteResult.trim()?"pointer":"not-allowed",fontWeight:700,fontFamily:"inherit",fontSize:13}}>
                📋 نسخ الهامش
              </button>
              <button onClick={()=>setFootnoteModal(null)} style={{padding:"9px 16px",borderRadius:8,background:"#f1f5f9",border:"0.5px solid #cbd5e1",cursor:"pointer",fontFamily:"inherit",fontSize:13,color:"#475569"}}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: معاينة استخراج الرابط الذكي ===== */}
      {urlPreview && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"white",borderRadius:16,padding:24,maxWidth:620,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)",direction:"rtl"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:15,color:"#1e293b"}}>🔗 معاينة المصدر المستخرَج</div>
              <button onClick={()=>setUrlPreview(null)} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:16,color:"#64748b"}}>✕</button>
            </div>
            <div style={{display:"grid",gap:10,fontSize:13,marginBottom:14}}>
              <div><strong>العنوان:</strong> <input value={urlPreview.title} onChange={e=>setUrlPreview(p=>({...p,title:e.target.value}))} style={{width:"100%",padding:"7px 10px",borderRadius:7,border:"0.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit",marginTop:4}}/></div>
              <div><strong>نوع المصدر:</strong>
                <select value={urlPreview.sourceType} onChange={e=>setUrlPreview(p=>({...p,sourceType:e.target.value}))} style={{width:"100%",padding:"7px 10px",borderRadius:7,border:"0.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit",marginTop:4}}>
                  {["كتاب عربي","كتاب أجنبي","رسالة ماجستير","أطروحة دكتوراه","بحث علمي","مجلة علمية","مؤتمر علمي","صحيفة","موقع إلكتروني","موسوعة","وثيقة أرشيفية","تقرير رسمي","مصدر أولي"].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><strong>الصلة بالأطروحة:</strong>
                <textarea value={urlPreview.relevance} onChange={e=>setUrlPreview(p=>({...p,relevance:e.target.value}))} rows={2} style={{width:"100%",padding:"7px 10px",borderRadius:7,border:"0.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit",marginTop:4,resize:"vertical"}}/>
              </div>
              <div><strong>ملخص الحاشية المقترح:</strong>
                <textarea value={urlPreview.footnoteSummary} onChange={e=>setUrlPreview(p=>({...p,footnoteSummary:e.target.value}))} rows={3} style={{width:"100%",padding:"7px 10px",borderRadius:7,border:"0.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit",marginTop:4,resize:"vertical"}}/>
              </div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setUrlPreview(null)} style={{padding:"8px 16px",borderRadius:8,background:"white",border:"0.5px solid #cbd5e1",color:"#64748b",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>إلغاء</button>
              <button onClick={confirmUrlPreview} style={{padding:"8px 16px",borderRadius:8,background:"#10b981",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:13}}>✅ تأكيد ومتابعة الإضافة</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: معاينة استخراج مصادر متعددة من رابط ===== */}
      {multiUrlPreview && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"white",borderRadius:16,padding:20,maxWidth:1000,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)",direction:"rtl",maxHeight:"92vh",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,color:"#1e293b"}}>📦 تم استخراج {multiUrlPreview.items.length} مصدر — راجع وحرّر قبل الحفظ</div>
              <button onClick={()=>setMultiUrlPreview(null)} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:16,color:"#64748b"}}>✕</button>
            </div>
            <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>أزل علامة "الإبقاء" لتجاهل أي مصدر — يمكنك تعديل كل الحقول.</div>
            <div style={{overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:10,paddingLeft:4}}>
              {multiUrlPreview.items.map((it, i) => {
                const upd = (k,v) => setMultiUrlPreview(p => ({ ...p, items: p.items.map((x,j)=> j===i ? {...x,[k]:v} : x) }));
                return (
                  <div key={i} style={{border:"0.5px solid #e2e8f0",borderRadius:10,padding:12,background:it.keep?"#fff":"#f8fafc",opacity:it.keep?1:0.55}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                      <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#475569",cursor:"pointer"}}>
                        <input type="checkbox" checked={it.keep} onChange={e=>upd("keep",e.target.checked)}/>
                        الإبقاء
                      </label>
                      <span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:5,fontWeight:600}}>#{i+1}</span>
                      <select value={it.sourceType||""} onChange={e=>upd("sourceType",e.target.value)} style={{padding:"5px 8px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:11,fontFamily:"inherit"}}>
                        {["كتاب عربي","كتاب أجنبي","رسالة ماجستير","أطروحة دكتوراه","بحث علمي","مجلة علمية","مؤتمر علمي","صحيفة","موقع إلكتروني","موسوعة","وثيقة أرشيفية","تقرير رسمي","مصدر أولي"].map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                      <select value={it.chapterId||""} onChange={e=>upd("chapterId",e.target.value)} style={{padding:"5px 8px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:11,fontFamily:"inherit",flex:1}}>
                        <option value="">— اختر الفصل المقترح —</option>
                        {chapters.map(ch=><option key={ch.id} value={ch.id}>{ch.titleAr.split(":")[0]}</option>)}
                      </select>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                      <input value={it.title||""} onChange={e=>upd("title",e.target.value)} placeholder="العنوان" style={{gridColumn:"1/-1",padding:"6px 10px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}}/>
                      <input value={it.author||""} onChange={e=>upd("author",e.target.value)} placeholder="المؤلف (اسم العائلة، الاسم الأول)" style={{padding:"6px 10px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}}/>
                      <input value={it.publisher||""} onChange={e=>upd("publisher",e.target.value)} placeholder="الناشر" style={{padding:"6px 10px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}}/>
                      <input value={it.place||""} onChange={e=>upd("place",e.target.value)} placeholder="مكان النشر" style={{padding:"6px 10px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}}/>
                      <input value={it.year||""} onChange={e=>upd("year",e.target.value)} placeholder="السنة" style={{padding:"6px 10px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}}/>
                      <input value={it.edition||""} onChange={e=>upd("edition",e.target.value)} placeholder="الطبعة" style={{padding:"6px 10px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}}/>
                      <input value={it.url||""} onChange={e=>upd("url",e.target.value)} placeholder="الرابط" style={{padding:"6px 10px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit",direction:"ltr"}}/>
                    </div>
                    {it.relevance && <div style={{fontSize:11,color:"#64748b",marginTop:6}}><strong>الصلة:</strong> {it.relevance}</div>}
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12,paddingTop:12,borderTop:"0.5px solid #e2e8f0"}}>
              <button onClick={()=>setMultiUrlPreview(null)} style={{padding:"8px 16px",borderRadius:8,background:"white",border:"0.5px solid #cbd5e1",color:"#64748b",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>إلغاء</button>
              <button onClick={saveAllMultiUrl} style={{padding:"8px 18px",borderRadius:8,background:"#10b981",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:13}}>
                ✅ حفظ {multiUrlPreview.items.filter(x=>x.keep).length} مصدر
              </button>
            </div>
          </div>
        </div>
      )}




      {/* ===== MODAL: توليد هوامش متعددة ===== */}
      {bulkFootnoteModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"white",borderRadius:16,padding:24,maxWidth:760,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)",direction:"rtl",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:15,color:"#1e293b"}}>📝 توليد هوامش متعددة ({bulkFootnoteModal.items.length})</div>
              <button onClick={()=>setBulkFootnoteModal(null)} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:16,color:"#64748b"}}>✕</button>
            </div>

            {!bulkFootnoteModal.generated ? (
              <>
                <div style={{fontSize:12,color:"#475569",marginBottom:10}}>أدخل رقم الصفحة لكل مصدر، ثم اضغط "توليد الهوامش".</div>
                <div style={{maxHeight:"50vh",overflowY:"auto",border:"0.5px solid #e2e8f0",borderRadius:8,marginBottom:14}}>
                  {bulkFootnoteModal.items.map((it, idx)=>(
                    <div key={it.doc.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderBottom:"0.5px solid #f1f5f9",fontSize:12}}>
                      <span style={{fontWeight:700,color:"#64748b",minWidth:22}}>{idx+1}.</span>
                      <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={it.doc.title}>{it.doc.title}</span>
                      <label style={{fontSize:11,color:"#475569"}}>ص</label>
                      <input
                        type="text"
                        value={it.page}
                        onChange={e=>{
                          const v = e.target.value;
                          setBulkFootnoteModal(m=>({...m, items: m.items.map((x,i)=>i===idx?{...x,page:v}:x)}));
                        }}
                        placeholder="رقم الصفحة"
                        style={{width:120,padding:"6px 8px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}}
                      />
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>{
                    const missing = bulkFootnoteModal.items.some(it=>!it.page.trim());
                    if (missing) { showNotif("⚠️ أدخل رقم الصفحة لكل مصدر","error"); return; }
                    const generated = bulkFootnoteModal.items.map(it=>({
                      doc: it.doc,
                      page: it.page.trim(),
                      text: buildArabicCitation(it.doc, it.page.trim(), true)
                    }));
                    setBulkFootnoteModal(m=>({...m, generated}));
                  }} style={{padding:"9px 18px",borderRadius:8,background:"#3B82F6",color:"white",border:"none",cursor:"pointer",fontWeight:700,fontFamily:"inherit",fontSize:13}}>توليد الهوامش</button>
                  <button onClick={()=>setBulkFootnoteModal(null)} style={{padding:"9px 16px",borderRadius:8,background:"#f1f5f9",border:"0.5px solid #cbd5e1",cursor:"pointer",fontFamily:"inherit",fontSize:13,color:"#475569"}}>إغلاق</button>
                </div>
              </>
            ) : (
              <>
                <div style={{fontSize:12,color:"#475569",marginBottom:10}}>يمكنك تعديل أي هامش قبل النسخ والإضافة للمراجع النهائية.</div>
                <div style={{maxHeight:"55vh",overflowY:"auto",marginBottom:14}}>
                  {bulkFootnoteModal.generated.map((g, idx)=>(
                    <div key={g.doc.id} style={{marginBottom:12}}>
                      <label style={{fontSize:12,fontWeight:600,color:"#1e293b",display:"block",marginBottom:4}}>الهامش {idx+1}:</label>
                      <textarea
                        value={g.text}
                        onChange={e=>{
                          const v = e.target.value;
                          setBulkFootnoteModal(m=>({...m, generated: m.generated.map((x,i)=>i===idx?{...x,text:v}:x)}));
                        }}
                        rows={3}
                        style={{width:"100%",padding:10,borderRadius:8,border:"1px solid #cbd5e1",fontSize:13,fontFamily:"inherit",boxSizing:"border-box",direction:"rtl",lineHeight:1.8,resize:"vertical"}}
                      />
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={async ()=>{
                    const all = bulkFootnoteModal.generated.map((g,i)=>`${i+1}. ${g.text}`).join("\n\n");
                    try { await navigator.clipboard.writeText(all); } catch {}
                    bulkFootnoteModal.generated.forEach(g => addToBibliography(g.doc, g.text));
                    showNotif(`✅ تم نسخ ${bulkFootnoteModal.generated.length} هوامش وإضافتها للمراجع النهائية`);
                    setTimeout(()=>setBulkFootnoteModal(null), 2000);
                  }} style={{padding:"10px 18px",borderRadius:8,background:"#10B981",color:"white",border:"none",cursor:"pointer",fontWeight:700,fontFamily:"inherit",fontSize:13}}>📋 نسخ جميع الهوامش</button>
                  <button onClick={()=>setBulkFootnoteModal(null)} style={{padding:"9px 16px",borderRadius:8,background:"#f1f5f9",border:"0.5px solid #cbd5e1",cursor:"pointer",fontFamily:"inherit",fontSize:13,color:"#475569"}}>إغلاق</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}




      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 100%)",color:"white",padding:"0 16px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,minHeight:60,paddingTop:6,paddingBottom:6}}>
          {/* Left column (visual top-left): Logout above AI model dropdown */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:5,order:2}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <NotificationBell onOpenSupervisor={openSupervisorTab} />
              {userEmail && (
                <span style={{fontSize:10,color:"#e2e8f0",opacity:0.9,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={userEmail}>👤 {userEmail}{userRole ? ` (${userRole==="supervisor"?"مشرف":"باحث"})` : ""}</span>
              )}
              <button onClick={handleLogout} title="تسجيل الخروج" style={{background:"rgba(239,68,68,0.85)",border:"1px solid rgba(255,255,255,0.25)",color:"white",padding:"5px 10px",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600}}>
                🚪 خروج
              </button>
            </div>
            <select value={aiModel} onChange={e=>{ setAiModel(e.target.value); setSelectedModel(e.target.value); }} title="اختر نموذج الذكاء الاصطناعي / الأدوات" style={{border:"1px solid rgba(255,255,255,0.3)",borderRadius:6,padding:"4px 8px",fontSize:11,background:"rgba(255,255,255,0.15)",color:"white",cursor:"pointer",fontFamily:"inherit",maxWidth:220}}>
              {AI_MODELS.map(m => <option key={m.id} value={m.id} style={{color:"#1e293b"}}>🤖 {m.label}</option>)}
            </select>
          </div>
          {/* Center: nav icons */}
          <div style={{display:"flex",gap:2,flexWrap:"wrap",alignItems:"center",order:1,flex:1,justifyContent:"center"}}>
            {navItems.map(n=>(
              <button key={n.id} onClick={()=>setPage(n.id)} style={{background:page===n.id?"rgba(255,255,255,0.2)":"transparent",border:"none",color:"white",padding:"5px 9px",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:"inherit",display:"flex",alignItems:"center",gap:3}}>
                <span>{n.icon}</span><span style={{display:"none"}} className="nav-label">{n.label}</span>
              </button>
            ))}
          </div>
          {/* Right (visual): brand */}
          <div style={{display:"flex",alignItems:"center",gap:10,order:0}}>
            <span style={{fontSize:24}}>🗂️</span>
            <div><div style={{fontWeight:700,fontSize:15}}>أرشيف الأطروحة</div><div style={{fontSize:10,opacity:0.75}}>الخليج العربي • الحرب العالمية الثانية 1939-1945 • د. اسعد النعيمي</div></div>
          </div>
        </div>
        {/* nav labels row */}
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",gap:2,paddingBottom:6}}>
          {navItems.map(n=>(
            <button key={n.id} onClick={()=>setPage(n.id)} style={{background:page===n.id?"rgba(255,255,255,0.15)":"transparent",border:"none",color:"white",padding:"3px 8px",borderRadius:5,cursor:"pointer",fontSize:11,fontFamily:"inherit",opacity:page===n.id?1:0.75}}>
              {n.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"20px 14px"}}>

        {/* ===== STRUCTURE — هيكل الأطروحة الديناميكي ===== */}
        {page==="structure" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
              <div>
                <h1 style={{fontSize:20,fontWeight:700,marginBottom:4}}>📖 هيكل الأطروحة — الفصول والمباحث والوثائق</h1>
                <p style={{color:"#64748b",fontSize:12}}>الخليج العربي في سنوات الحرب العالمية الثانية 1939-1945 — اسعد حامد اسعد النعيمي — جامعة الموصل</p>
              </div>
              <div style={{fontSize:11,color:"#94a3b8",background:"#f8fafc",borderRadius:8,padding:"6px 12px",border:"0.5px solid #e2e8f0"}}>
                💡 اضغط "تعديل" بجانب أي فصل أو مبحث لتغيير عنوانه — ستُحدَّث الوثائق المرتبطة تلقائياً
              </div>
            </div>

            {/* شريط البحث في هيكل الأطروحة */}
            <div style={{background:"white",borderRadius:10,padding:10,border:"0.5px solid #e2e8f0",marginBottom:14,display:"flex",gap:8,alignItems:"center",position:"sticky",top:0,zIndex:5}}>
              <span style={{fontSize:16}}>🔍</span>
              <input
                value={structureSearch}
                onChange={e=>setStructureSearch(e.target.value)}
                placeholder="ابحث في الفصول والمباحث والفقرات..."
                style={{flex:1,padding:"7px 10px",borderRadius:7,border:"0.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit",outline:"none"}}
              />
              {structureSearch && (
                <button onClick={()=>setStructureSearch("")} style={{padding:"6px 10px",borderRadius:7,background:"#f1f5f9",border:"0.5px solid #cbd5e1",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>مسح</button>
              )}
            </div>

            {(() => {
              const q = structureSearch.trim().toLowerCase();
              const visibleChapters = !q ? chapters : chapters.filter(ch => {
                if ((ch.titleAr||"").toLowerCase().includes(q)) return true;
                return (ch.sections||[]).some(s => (s.title||"").toLowerCase().includes(q) || (s.num||"").toLowerCase().includes(q));
              });
              if (visibleChapters.length === 0) {
                return <div style={{background:"white",borderRadius:10,padding:20,border:"0.5px solid #e2e8f0",textAlign:"center",color:"#94a3b8",fontSize:13}}>لا توجد نتائج مطابقة لـ "{structureSearch}"</div>;
              }
              return visibleChapters.map(ch=>{
              const chDocs = combinedDocs.filter(d=>d.chapterId===ch.id);
              const mainSections = ch.sections.filter(s=>!s.id.includes("a")&&!s.id.includes("b")&&!s.id.includes("c"));
              const isEditingThisChapter = editingChapter?.id === ch.id;
              return (
                <div key={ch.id} style={{background:"white",borderRadius:14,border:`2px solid ${ch.color}30`,borderTop:`4px solid ${ch.color}`,marginBottom:20,overflow:"hidden"}}>

                  {/* ===== رأس الفصل مع زر التعديل ===== */}
                  <div style={{padding:"14px 18px",background:`${ch.color}08`,borderBottom:`0.5px solid ${ch.color}20`}}>
                    {isEditingThisChapter ? (
                      // وضع التعديل
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <input
                          autoFocus
                          value={editingChapter.value}
                          onChange={e=>setEditingChapter(p=>({...p,value:e.target.value}))}
                          onKeyDown={e=>{ if(e.key==="Enter") commitChapterEdit(); if(e.key==="Escape") setEditingChapter(null); }}
                          style={{flex:1,padding:"7px 12px",borderRadius:7,border:`2px solid ${ch.color}`,fontSize:13,fontFamily:"inherit",fontWeight:600,outline:"none"}}
                        />
                        <button onClick={commitChapterEdit} style={{padding:"6px 14px",borderRadius:7,background:ch.color,color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600}}>حفظ</button>
                        <button onClick={()=>setEditingChapter(null)} style={{padding:"6px 10px",borderRadius:7,background:"transparent",border:"0.5px solid #cbd5e1",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>إلغاء</button>
                      </div>
                    ) : (
                      // وضع العرض
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:14,color:ch.color,marginBottom:4}}>{ch.titleAr}</div>
                          <div style={{display:"flex",gap:8,fontSize:11,color:"#64748b"}}>
                            <span>📄 {chDocs.length} وثيقة</span>
                            <span>⭐ {chDocs.filter(d=>d.priority==="★★★").length} عالية الأولوية</span>
                            <span>🆕 {chDocs.filter(d=>d.isNew).length} جديدة</span>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          <button
                            onClick={()=>setEditingChapter({id:ch.id,value:ch.titleAr})}
                            style={{padding:"4px 10px",borderRadius:6,background:"white",border:`1px solid ${ch.color}`,color:ch.color,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
                            ✏️ تعديل
                          </button>
                          <button
                            onClick={()=>openAddSection(ch.id)}
                            style={{padding:"4px 10px",borderRadius:6,background:"white",border:`1px solid ${ch.color}`,color:ch.color,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
                            ＋ مبحث
                          </button>
                          <button
                            onClick={()=>{setSearchFilters(p=>({...p,chapterId:ch.id.toString(),query:""}));setPage("search");}}
                            style={{padding:"4px 10px",borderRadius:6,background:ch.color,color:"white",border:"none",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
                            عرض الوثائق
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ===== نموذج إضافة مبحث جديد ===== */}
                  {addingSecChId === ch.id && (
                    <div style={{padding:"12px 18px",background:`${ch.color}05`,borderBottom:`0.5px solid ${ch.color}20`,display:"grid",gap:8}}>
                      <div style={{fontSize:12,fontWeight:600,color:ch.color}}>إضافة مبحث جديد إلى: {ch.titleAr}</div>
                      <input
                        autoFocus
                        value={newSecForm.title}
                        onChange={e=>setNewSecForm(p=>({...p,title:e.target.value}))}
                        placeholder="عنوان المبحث *"
                        style={{padding:"7px 12px",borderRadius:7,border:`1px solid ${ch.color}50`,fontSize:12,fontFamily:"inherit",outline:"none"}}
                      />
                      <input
                        value={newSecForm.num}
                        onChange={e=>setNewSecForm(p=>({...p,num:e.target.value}))}
                        placeholder="رقم المبحث (تلقائي)"
                        style={{padding:"7px 12px",borderRadius:7,border:`1px solid ${ch.color}50`,fontSize:12,fontFamily:"inherit",outline:"none",maxWidth:200}}
                      />
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>submitAddSection(ch.id)} style={{padding:"6px 16px",borderRadius:7,background:"#3B82F6",color:"white",border:"none",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600}}>إضافة</button>
                        <button onClick={()=>{setAddingSecChId(null);setNewSecForm({title:"",num:""});}} style={{padding:"6px 14px",borderRadius:7,background:"transparent",border:"0.5px solid #cbd5e1",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>إلغاء</button>
                      </div>
                    </div>
                  )}

                  {/* ===== المباحث الرئيسية ===== */}
                  <div style={{padding:"12px 18px"}}>
                    {mainSections.map(sec=>{
                      const secDocs = combinedDocs.filter(d=>d.sectionId===sec.id||d.sectionId?.startsWith(sec.id));
                      const subSections = ch.sections.filter(s=>s.id.startsWith(sec.id)&&s.id!==sec.id&&/^[a-z]+$/i.test(s.id.slice(sec.id.length)));
                      const isEditingThisSec = editingSection?.chId===ch.id && editingSection?.secId===sec.id;
                      return (
                        <div key={sec.id} style={{marginBottom:16,paddingBottom:16,borderBottom:"0.5px solid #f1f5f9"}}>

                          {/* عنوان المبحث مع زر التعديل */}
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,gap:8}}>
                            {isEditingThisSec ? (
                              <div style={{display:"flex",gap:6,alignItems:"center",flex:1}}>
                                <input
                                  autoFocus
                                  value={editingSection.value}
                                  onChange={e=>setEditingSection(p=>({...p,value:e.target.value}))}
                                  onKeyDown={e=>{ if(e.key==="Enter") commitSectionEdit(); if(e.key==="Escape") setEditingSection(null); }}
                                  style={{flex:1,padding:"5px 10px",borderRadius:6,border:`2px solid ${ch.color}`,fontSize:12,fontFamily:"inherit",fontWeight:600,outline:"none"}}
                                />
                                <button onClick={commitSectionEdit} style={{padding:"4px 10px",borderRadius:6,background:ch.color,color:"white",border:"none",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:600}}>حفظ</button>
                                <button onClick={()=>setEditingSection(null)} style={{padding:"4px 8px",borderRadius:6,background:"transparent",border:"0.5px solid #cbd5e1",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>إلغاء</button>
                              </div>
                            ) : (
                              <div style={{display:"flex",alignItems:"center",gap:6,flex:1,flexWrap:"wrap"}}>
                                <div style={{fontWeight:600,fontSize:13,color:"#1e293b",flex:1,minWidth:140}}>{sec.title}</div>
                                <button
                                  onClick={e=>{e.stopPropagation();setEditingSection({chId:ch.id,secId:sec.id,value:sec.title});}}
                                  style={{padding:"2px 8px",borderRadius:5,background:"transparent",border:`0.5px solid ${ch.color}`,color:ch.color,cursor:"pointer",fontSize:10,fontFamily:"inherit",flexShrink:0}}>
                                  ✏️
                                </button>
                                <button
                                  onClick={e=>{e.stopPropagation();openAddSubSection(sec.id);}}
                                  title="إضافة فقرة فرعية"
                                  style={{padding:"2px 8px",borderRadius:5,background:"transparent",border:`0.5px solid ${ch.color}`,color:ch.color,cursor:"pointer",fontSize:10,fontFamily:"inherit",flexShrink:0}}>
                                  ＋ فقرة
                                </button>
                                {sec.userAdded && (
                                  <button
                                    onClick={e=>{e.stopPropagation();askDeleteSection(ch.id,sec.id);}}
                                    title="حذف المبحث"
                                    style={{padding:"2px 8px",borderRadius:5,background:"#fee2e2",border:"0.5px solid #fecaca",color:"#dc2626",cursor:"pointer",fontSize:10,fontFamily:"inherit",flexShrink:0}}>
                                    🗑️
                                  </button>
                                )}
                              </div>
                            )}
                            <span style={{background:`${ch.color}15`,color:ch.color,borderRadius:5,padding:"1px 8px",fontSize:10,fontWeight:600,flexShrink:0}}>{secDocs.length} وثيقة</span>
                          </div>

                          {/* العناصر الفرعية */}
                          {subSections.length>0 && (
                            <div style={{marginBottom:8,paddingRight:8,borderRight:`2px solid ${ch.color}30`}}>
                              {subSections.map(sub=>(
                                <div key={sub.id} style={{fontSize:11,color:"#64748b",padding:"2px 0",display:"flex",alignItems:"center",gap:6}}>
                                  <span style={{flex:1}}>{sub.title}</span>
                                  {sub.userAdded && (
                                    <button
                                      onClick={()=>askDeleteSection(ch.id,sub.id)}
                                      title="حذف الفقرة"
                                      style={{padding:"1px 6px",borderRadius:4,background:"#fee2e2",border:"0.5px solid #fecaca",color:"#dc2626",cursor:"pointer",fontSize:9,fontFamily:"inherit"}}>
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* نموذج إضافة فقرة فرعية */}
                          {addingSubSecId === sec.id && (
                            <div style={{margin:"6px 0 10px",padding:"10px 12px",background:`${ch.color}06`,borderRadius:7,border:`0.5px solid ${ch.color}30`,display:"grid",gap:6}}>
                              <input
                                autoFocus
                                value={newSubForm.title}
                                onChange={e=>setNewSubForm({title:e.target.value})}
                                placeholder="عنوان الفقرة الفرعية *"
                                style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${ch.color}40`,fontSize:11,fontFamily:"inherit",outline:"none"}}
                              />
                              <div style={{display:"flex",gap:6}}>
                                <button onClick={()=>submitAddSubSection(ch.id,sec.id)} style={{padding:"5px 14px",borderRadius:6,background:"#3B82F6",color:"white",border:"none",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:600}}>إضافة</button>
                                <button onClick={()=>{setAddingSubSecId(null);setNewSubForm({title:""});}} style={{padding:"5px 12px",borderRadius:6,background:"transparent",border:"0.5px solid #cbd5e1",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>إلغاء</button>
                              </div>
                            </div>
                          )}

                          {/* الوثائق المرتبطة بالمبحث */}
                          {secDocs.length>0 ? (
                            <div style={{display:"grid",gap:5}}>
                              {secDocs
                                .sort((a,b)=>({"★★★":3,"★★":2,"★":1}[b.priority]||0)-({"★★★":3,"★★":2,"★":1}[a.priority]||0))
                                .map(d=>(
                                <div key={d.id} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"7px 10px",background:"#f8fafc",borderRadius:7,border:"0.5px solid #f1f5f9",transition:"all 0.15s"}}
                                  onMouseEnter={e=>{e.currentTarget.style.background="#eff6ff";e.currentTarget.style.borderColor=ch.color+"40";}}
                                  onMouseLeave={e=>{e.currentTarget.style.background="#f8fafc";e.currentTarget.style.borderColor="#f1f5f9";}}>
                                  <span style={{background:pBg(d.priority),color:pColor(d.priority),borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:700,flexShrink:0,marginTop:2}}>{d.priority}</span>
                                  <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>{setSelectedDoc(d);setPage("detail");}}>
                                    <div style={{fontSize:12,fontWeight:500,marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.title}</div>
                                    <div style={{display:"flex",gap:6,fontSize:10,color:"#94a3b8",flexWrap:"wrap"}}>
                                      {d.archiveRef&&<span style={{color:"#8B5CF6",fontFamily:"monospace"}}>{d.archiveRef}</span>}
                                      {d.isNew&&<span style={{color:"#16a34a"}}>🆕 جديد</span>}
                                      {d.notes&&<span>{d.notes.substring(0,50)}{d.notes.length>50?"...":""}</span>}
                                    </div>
                                  </div>
                                  {/* زر هامش سريع من صفحة الهيكل */}
                                  <button
                                    onClick={e=>{e.stopPropagation();openFootnoteModal(d);}}
                                    title="توليد هامش"
                                    style={{padding:"3px 8px",borderRadius:5,background:"#faf5ff",border:"0.5px solid #d8b4fe",color:"#7C3AED",cursor:"pointer",fontSize:10,fontFamily:"inherit",flexShrink:0}}>
                                    📝
                                  </button>
                                  <button
                                    onClick={e=>{e.stopPropagation();askDeleteSource(d.id);}}
                                    title="حذف"
                                    style={{padding:"3px 8px",borderRadius:5,background:"#fee2e2",border:"0.5px solid #fecaca",color:"#dc2626",cursor:"pointer",fontSize:10,fontFamily:"inherit",flexShrink:0}}>
                                    🗑️
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{padding:"8px 10px",background:"#fff7ed",borderRadius:7,border:"0.5px solid #fed7aa",fontSize:11,color:"#c2410c"}}>
                              ⚠️ لا توجد وثائق مرتبطة بهذا المبحث بعد — أضف مصادر من مكتبتك أو ابحث في QDL
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* ===== وثائق مضافة للفصل بدون مبحث محدد (Issue A safety net) ===== */}
                    {(() => {
                      const sectionIds = new Set(ch.sections.map(s => s.id));
                      const unclassified = chDocs.filter(d => !d.sectionId || (!sectionIds.has(d.sectionId) && ![...sectionIds].some(sid => d.sectionId?.startsWith(sid))));
                      if (unclassified.length === 0) return null;
                      return (
                        <div style={{marginTop:8,padding:"10px 12px",background:"#f0f9ff",borderRadius:8,border:"0.5px dashed #93c5fd"}}>
                          <div style={{fontSize:12,fontWeight:600,color:"#1e40af",marginBottom:6}}>📥 وثائق مضافة لهذا الفصل (بدون مبحث محدد) — {unclassified.length}</div>
                          <div style={{display:"grid",gap:5}}>
                            {unclassified.map(d => (
                              <div key={d.id} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 10px",background:"white",borderRadius:6,border:"0.5px solid #dbeafe"}}>
                                <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>{setSelectedDoc(d);setPage("detail");}}>
                                  <div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.title}</div>
                                  {d.archiveRef && <div style={{fontSize:10,color:"#8B5CF6",fontFamily:"monospace"}}>{d.archiveRef}</div>}
                                </div>
                                <button onClick={e=>{e.stopPropagation();openFootnoteModal(d);}} title="توليد هامش" style={{padding:"3px 8px",borderRadius:5,background:"#faf5ff",border:"0.5px solid #d8b4fe",color:"#7C3AED",cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>📝</button>
                                <button onClick={e=>{e.stopPropagation();askDeleteSource(d.id);}} title="حذف" style={{padding:"3px 8px",borderRadius:5,background:"#fee2e2",border:"0.5px solid #fecaca",color:"#dc2626",cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>🗑️</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                </div>
              );
            });
            })()}
          </div>
        )}

        {/* ===== HOME ===== */}
        {page==="home" && (
          <div>
            {/* ===== عنوان الصفحة ===== */}
            <div style={{textAlign:"center",marginBottom:20}}>
              <h1 style={{fontSize:22,fontWeight:700,marginBottom:4}}>الفهرس الشامل للأطروحة</h1>
              <p style={{color:"#64748b",fontSize:12}}>الطالب: اسعد حامد اسعد النعيمي — جامعة الموصل — إشراف: أ.م.د فواز موفق ذنون</p>
            </div>

            {/* ===== الميزة 1: شريط نسب الإنجاز العام ===== */}
            {(() => {
              const overallPct = calcOverallProgress();
              return (
                <div style={{background:"white",borderRadius:14,padding:"18px 20px",border:"0.5px solid #e2e8f0",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                  {/* رأس الشريط العام */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontWeight:700,fontSize:14,color:"#1e3a5f"}}>📈 مسار إنجاز الأطروحة</div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:11,color:"#64748b"}}>الإنجاز العام</span>
                      <span style={{fontSize:22,fontWeight:800,color: overallPct >= 70 ? "#10B981" : overallPct >= 40 ? "#F59E0B" : "#3B82F6"}}>{overallPct}%</span>
                    </div>
                  </div>
                  {/* شريط التقدم العام */}
                  <div style={{height:14,background:"#e2e8f0",borderRadius:7,overflow:"hidden",marginBottom:16,position:"relative"}}>
                    <div style={{height:"100%",width:`${overallPct}%`,background:`linear-gradient(90deg, #1e3a5f, ${overallPct >= 70 ? "#10B981" : overallPct >= 40 ? "#F59E0B" : "#3B82F6"})`,borderRadius:7,transition:"width 0.8s ease"}}/>
                    {overallPct > 10 && (
                      <span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"white",fontWeight:600}}>{overallPct}%</span>
                    )}
                  </div>
                  {/* أشرطة الفصول */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
                    {chapters.map(ch => {
                      const pct  = calcChapterProgress(ch.id);
                      const cnt  = combinedDocs.filter(d => d.chapterId === ch.id).length;
                      const bibs = bibliography.filter(b => combinedDocs.find(d => d.id === b.docId && d.chapterId === ch.id)).length;
                      return (
                        <div key={ch.id} style={{background:"#f8fafc",borderRadius:9,padding:"10px 12px",border:`0.5px solid ${ch.color}20`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                            <span style={{fontSize:11,fontWeight:600,color:ch.color}}>{ch.titleAr.split(":")[0]}</span>
                            <span style={{fontSize:13,fontWeight:700,color:pct >= 70?"#10B981":pct >= 40?"#F59E0B":ch.color}}>{pct}%</span>
                          </div>
                          <div style={{height:8,background:"#e2e8f0",borderRadius:4,overflow:"hidden",marginBottom:5}}>
                            <div style={{height:"100%",width:`${pct}%`,background:ch.color,borderRadius:4,transition:"width 0.7s ease"}}/>
                          </div>
                          <div style={{display:"flex",gap:10,fontSize:10,color:"#94a3b8"}}>
                            <span>📄 {cnt} وثيقة</span>
                            <span>📝 {bibs} هامش</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{marginTop:10,fontSize:10,color:"#94a3b8",textAlign:"center"}}>
                    * تُحسب النسبة بناءً على عدد الوثائق المؤرشفة (60٪) والهوامش المُستخرجة (40٪) لكل فصل
                  </div>
                </div>
              );
            })()}

            {/* ===== تصنيف المصادر الأكاديمية مع نسب الإنجاز لكل فئة ===== */}
            {(() => {
              const CATEGORIES = [
                { keys: ["كتاب","كتاب عربي","كتاب أجنبي"], label: "📚 الكتب",                color: "#3B82F6", target: 40 },
                { keys: ["رسالة ماجستير","رسالة علمية"],   label: "🎓 رسائل الماجستير",       color: "#8B5CF6", target: 15 },
                { keys: ["أطروحة دكتوراه"],                 label: "🎓 أطاريح الدكتوراه",      color: "#7C3AED", target: 10 },
                { keys: ["بحث","بحث علمي"],                 label: "🔬 البحوث",                color: "#0EA5E9", target: 20 },
                { keys: ["مقالة","مجلة علمية"],             label: "📰 المجلات العلمية",       color: "#F59E0B", target: 20 },
                { keys: ["مؤتمر علمي","مؤتمر"],             label: "🏛️ المؤتمرات",            color: "#06B6D4", target: 10 },
                { keys: ["صحيفة"],                          label: "🗞️ الصحف",                color: "#EF4444", target: 10 },
                { keys: ["وثيقة أرشيفية","مصدر أولي"],     label: "🗂️ الوثائق والمصادر الأولية", color: "#10B981", target: 25 },
                { keys: ["تقرير","تقرير رسمي"],             label: "📑 التقارير الرسمية",      color: "#64748b", target: 10 },
                { keys: ["موقع إلكتروني"],                  label: "🌐 المواقع الإلكترونية",   color: "#0EA5E9", target: 10 },
                { keys: ["موسوعة"],                         label: "📖 الموسوعات",             color: "#14B8A6", target: 5  },
              ].map(c => ({ ...c, key: c.keys[0] }));

              const allSources = [...docs, ...library];
              const totalSources = allSources.length || 1;
              return (
                <div style={{background:"white",borderRadius:14,padding:"18px 20px",border:"0.5px solid #e2e8f0",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontWeight:700,fontSize:14,color:"#1e3a5f"}}>🏷️ تصنيف المصادر الأكاديمية حسب النوع</div>
                    <span style={{fontSize:11,color:"#64748b"}}>المجموع: {allSources.length} مصدر</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
                    {CATEGORIES.map(c => {
                      const count = allSources.filter(s => c.keys.includes(s.sourceType || s.category)).length;
                      const pct = Math.min(100, Math.round((count / c.target) * 100));
                      const bibs = bibliography.filter(b => c.keys.includes(b.category)).length;

                      return (
                        <div key={c.key} style={{background:"#f8fafc",borderRadius:9,padding:"10px 12px",border:`0.5px solid ${c.color}22`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                            <span style={{fontSize:11,fontWeight:600,color:c.color}}>{c.label}</span>
                            <span style={{fontSize:12,fontWeight:700,color:pct >= 100 ? "#10B981" : c.color}}>{pct}%</span>
                          </div>
                          <div style={{height:6,background:"#e2e8f0",borderRadius:3,overflow:"hidden",marginBottom:5}}>
                            <div style={{height:"100%",width:`${pct}%`,background:c.color,borderRadius:3,transition:"width 0.6s ease"}}/>
                          </div>
                          <div style={{display:"flex",gap:10,fontSize:10,color:"#94a3b8"}}>
                            <span>📄 {count} / {c.target}</span>
                            <span>📝 {bibs} هامش</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{marginTop:10,fontSize:10,color:"#94a3b8",textAlign:"center"}}>
                    * النسبة محسوبة على هدف تقديري لكل فئة — يكتشف الذكاء الاصطناعي النوع تلقائياً عند رفع كل ملف
                  </div>
                </div>
              );
            })()}

            {/* ===== بطاقات الإحصاء السريع ===== */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
              {[
                {label:"إجمالي الوثائق",      v:stats.total,     c:"#3B82F6", i:"📄"},
                {label:"عالية الأولوية ★★★", v:stats.highP,     c:"#10B981", i:"⭐"},
                {label:"هوامش مُستخرجة",     v:bibliography.length, c:"#8B5CF6", i:"📝"},
                {label:"بطاقات بحثية",        v:cards.length,    c:"#F59E0B", i:"🗃️"},
              ].map((s,i)=>(
                <div key={i} style={{background:"white",borderRadius:12,padding:"14px 12px",border:"0.5px solid #e2e8f0",textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                  <div style={{fontSize:24,marginBottom:6}}>{s.i}</div>
                  <div style={{fontSize:26,fontWeight:700,color:s.c,lineHeight:1}}>{s.v}</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:4}}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>

              {/* ===== الميزة 2: مؤشر تنوع المصادر لكل فصل ===== */}
              <div style={{background:"white",borderRadius:12,padding:16,border:"0.5px solid #e2e8f0"}}>
                <div style={{fontWeight:600,fontSize:13,marginBottom:14,color:"#1e293b"}}>📊 تنوع الأوزان العلمية لكل فصل</div>
                {chapters.map(ch => {
                  const diversity = calcDiversityForChapter(ch.id);
                  const total     = combinedDocs.filter(d => d.chapterId === ch.id).length;
                  return (
                    <div key={ch.id} style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,alignItems:"center"}}>
                        <span style={{fontSize:12,fontWeight:600,color:ch.color}}>{ch.titleAr.split(":")[0]}</span>
                        <span style={{fontSize:10,color:"#94a3b8"}}>{total} مصدر</span>
                      </div>
                      {total === 0 ? (
                        <div style={{fontSize:11,color:"#94a3b8",fontStyle:"italic"}}>لا توجد مصادر مُضافة بعد</div>
                      ) : (
                        <div>
                          {/* شريط تراكمي متعدد الألوان */}
                          <div style={{height:10,background:"#f1f5f9",borderRadius:5,overflow:"hidden",display:"flex",marginBottom:5}}>
                            {diversity.map((dc, i) => (
                              <div key={i} title={`${dc.label}: ${dc.pct}%`} style={{height:"100%",width:`${dc.pct}%`,background:dc.color,transition:"width 0.5s"}}/>
                            ))}
                          </div>
                          {/* تفاصيل نصية */}
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {diversity.map((dc,i) => (
                              <span key={i} style={{fontSize:10,background:`${dc.color}15`,color:dc.color,borderRadius:4,padding:"1px 6px"}}>
                                {dc.label}: {dc.pct}%
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ===== قسم أيمن: آخر الوثائق ===== */}
              <div style={{display:"grid",gap:14}}>
                <div style={{background:"white",borderRadius:12,padding:14,border:"0.5px solid #e2e8f0"}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>🕐 آخر الوثائق المضافة</div>
                  {docs.slice(0,5).map(d=>(
                    <div key={d.id} onClick={()=>{setSelectedDoc(d);setPage("detail");}} style={{padding:"6px 0",borderBottom:"0.5px solid #f1f5f9",cursor:"pointer",display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:10,background:pBg(d.priority),color:pColor(d.priority),borderRadius:4,padding:"1px 5px",flexShrink:0}}>{d.priority}</span>
                      <div style={{fontSize:12,fontWeight:500,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ===== الميزة 3: بطاقة حافز المؤرخ اليومي ===== */}
            <div style={{background:"linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 50%, #1e3a5f 100%)",borderRadius:14,padding:"18px 20px",marginBottom:16,color:"white",border:"none",position:"relative",overflow:"hidden"}}>
              {/* زخرفة خلفية */}
              <div style={{position:"absolute",top:-20,left:-20,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.04)",pointerEvents:"none"}}/>
              <div style={{position:"absolute",bottom:-30,right:-10,width:160,height:160,borderRadius:"50%",background:"rgba(255,255,255,0.03)",pointerEvents:"none"}}/>
              {/* رأس البطاقة */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:20}}>⚡</span> حافز المؤرخ اليومي
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button
                    onClick={()=>setDailyQuoteIdx(i=>(i+1)%MOTIVATIONAL_QUOTES.length)}
                    style={{padding:"4px 10px",borderRadius:6,background:"rgba(255,255,255,0.15)",border:"none",color:"white",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
                    تجديد ←
                  </button>
                  <button
                    onClick={()=>setFuelCardExpanded(p=>!p)}
                    style={{padding:"4px 10px",borderRadius:6,background:"rgba(255,255,255,0.15)",border:"none",color:"white",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
                    {fuelCardExpanded ? "طيّ ▲" : "توسيع ▼"}
                  </button>
                </div>
              </div>
              {/* العبارة التحفيزية */}
              <div style={{background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"12px 16px",marginBottom:fuelCardExpanded?14:0,lineHeight:1.8,fontSize:13,fontStyle:"italic",backdropFilter:"blur(4px)"}}>
                "{MOTIVATIONAL_QUOTES[dailyQuoteIdx]}"
              </div>
              {/* حدث اليوم التاريخي */}
              {fuelCardExpanded && (
                <div style={{borderTop:"0.5px solid rgba(255,255,255,0.2)",paddingTop:12}}>
                  <div style={{fontSize:11,opacity:0.7,marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
                    <span>📅</span>
                    <span>حدث في مثل هذا اليوم من سنوات الحرب في الخليج (1939-1945)</span>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.08)",borderRadius:9,padding:"10px 14px",fontSize:12,lineHeight:1.8,borderRight:"3px solid rgba(255,255,255,0.3)"}}>
                    {historicalEvent}
                  </div>
                </div>
              )}
            </div>

            {/* ===== الميزة 2 (تفصيلية): مؤشر التنوع لكل مبحث ===== */}
            <div style={{background:"white",borderRadius:12,padding:16,border:"0.5px solid #e2e8f0"}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>🔬 مؤشر تنوع المصادر — تفصيل المباحث</span>
                <span style={{fontSize:11,color:"#94a3b8",fontWeight:400}}>يساعدك على ضمان عدم الاعتماد على نوع واحد من المراجع</span>
              </div>
              {chapters.map(ch => {
                const mainSections = ch.sections.filter(s => !s.id.includes("a") && !s.id.includes("b") && !s.id.includes("c"));
                return (
                  <div key={ch.id} style={{marginBottom:16,borderBottom:"0.5px solid #f1f5f9",paddingBottom:16}}>
                    <div style={{fontSize:12,fontWeight:700,color:ch.color,marginBottom:8}}>{ch.titleAr.split(":")[0]}</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:8}}>
                      {mainSections.map(sec => {
                        const secDiversity = calcDiversityForSection(sec.id);
                        const secDocs      = combinedDocs.filter(d => d.sectionId === sec.id || d.sectionId?.startsWith(sec.id));
                        if (secDocs.length === 0) return null;
                        return (
                          <div key={sec.id} style={{background:"#f8fafc",borderRadius:8,padding:"9px 11px",border:`0.5px solid ${ch.color}15`}}>
                            <div style={{fontSize:11,fontWeight:600,color:"#475569",marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={sec.title}>{sec.title}</div>
                            <div style={{height:7,background:"#e2e8f0",borderRadius:4,overflow:"hidden",display:"flex",marginBottom:5}}>
                              {secDiversity.map((dc,i) => (
                                <div key={i} title={`${dc.label}: ${dc.pct}%`} style={{height:"100%",width:`${dc.pct}%`,background:dc.color}}/>
                              ))}
                            </div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                              {secDiversity.map((dc,i) => (
                                <span key={i} style={{fontSize:9,background:`${dc.color}12`,color:dc.color,borderRadius:3,padding:"0 4px"}}>
                                  {dc.label.split(" ")[0]}: {dc.pct}%
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== SEARCH / DOCS ===== */}
        {page==="search" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h1 style={{fontSize:20,fontWeight:700}}>🗂️ قاعدة الوثائق الأرشيفية</h1>
              <span style={{fontSize:12,color:"#64748b",background:"#eff6ff",padding:"3px 10px",borderRadius:20}}>{filtered.length} وثيقة</span>
            </div>
            <div style={{background:"white",borderRadius:12,padding:14,border:"0.5px solid #e2e8f0",marginBottom:14}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10}}>
                <input placeholder="ابحث في العناوين، أرقام IOR، المباحث..." value={searchFilters.query} onChange={e=>setSearchFilters(p=>({...p,query:e.target.value}))} style={{padding:"8px 12px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit"}}/>
                <select value={searchFilters.chapterId} onChange={e=>setSearchFilters(p=>({...p,chapterId:e.target.value}))} style={{padding:"8px 10px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}}>
                  <option value="">كل الفصول</option>
                  {CHAPTERS_DATA.map(ch=><option key={ch.id} value={ch.id}>{ch.titleAr.split(":")[0]}</option>)}
                </select>
                <select value={searchFilters.priority} onChange={e=>setSearchFilters(p=>({...p,priority:e.target.value}))} style={{padding:"8px 10px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}}>
                  <option value="">كل الأولويات</option>
                  <option value="★★★">★★★ اقرأه كاملاً</option>
                  <option value="★★">★★ أوراق محددة</option>
                  <option value="★">★ احفظ المرجع</option>
                </select>
                <select value={searchFilters.isNew} onChange={e=>setSearchFilters(p=>({...p,isNew:e.target.value}))} style={{padding:"8px 10px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}}>
                  <option value="">الكل</option>
                  <option value="new">🆕 الجديدة فقط</option>
                </select>
              </div>
            </div>
            <div style={{background:"white",borderRadius:12,border:"0.5px solid #e2e8f0",overflow:"hidden"}}>
              {filtered.map(d=>{
                const ch = CHAPTERS_DATA.find(c=>c.id===d.chapterId);
                return (
                  <div key={d.id} style={{padding:"11px 16px",borderBottom:"0.5px solid #f1f5f9",display:"flex",gap:10,alignItems:"flex-start",transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background="white"}>
                    <div style={{display:"flex",flexDirection:"column",gap:3,flexShrink:0,width:36,alignItems:"center"}}>
                      <span style={{background:pBg(d.priority),color:pColor(d.priority),borderRadius:5,padding:"1px 5px",fontSize:10,fontWeight:700}}>{d.priority}</span>
                      {d.isNew && <span style={{background:"#f0fdf4",color:"#16a34a",borderRadius:5,padding:"1px 5px",fontSize:9}}>جديد</span>}
                    </div>
                    <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>{setSelectedDoc(d);setPage("detail");}}>
                      <div style={{fontWeight:500,fontSize:13,marginBottom:2}}>{d.title}</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:11,color:"#64748b"}}>
                        {d.archiveRef && <span style={{color:"#8B5CF6",fontFamily:"monospace"}}>{d.archiveRef}</span>}
                        {ch && <span style={{color:ch.color}}>● {ch.titleAr.split(":")[0]}</span>}
                        {d.section && <span>{d.section}</span>}
                      </div>
                      {d.notes && <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{d.notes}</div>}
                    </div>
                    <button onClick={e=>{e.stopPropagation();askDeleteSource(d.id);}} title="حذف" style={{padding:"4px 8px",borderRadius:6,background:"#fee2e2",color:"#dc2626",border:"none",cursor:"pointer",fontSize:12,fontFamily:"inherit",flexShrink:0,alignSelf:"flex-start"}}>🗑️</button>
                  </div>
                );
              })}
              {filtered.length===0 && <div style={{padding:40,textAlign:"center",color:"#94a3b8"}}>لا توجد نتائج</div>}
            </div>
          </div>
        )}

        {/* ===== DETAIL ===== */}
        {page==="detail" && selectedDoc && (
          <div>
            <button onClick={()=>setPage("search")} style={{marginBottom:14,padding:"7px 14px",borderRadius:8,border:"0.5px solid #cbd5e1",background:"transparent",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>← العودة</button>
            <div style={{background:"white",borderRadius:12,padding:20,border:"0.5px solid #e2e8f0",marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div style={{flex:1}}>
                  <h1 style={{fontSize:17,fontWeight:700,marginBottom:8,lineHeight:1.5}}>{selectedDoc.title}</h1>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <span style={{background:pBg(selectedDoc.priority),color:pColor(selectedDoc.priority),borderRadius:6,padding:"2px 10px",fontSize:12,fontWeight:600}}>{selectedDoc.priority}</span>
                    {selectedDoc.isNew && <span style={{background:"#f0fdf4",color:"#16a34a",borderRadius:6,padding:"2px 8px",fontSize:11}}>🆕 وثيقة جديدة</span>}
                    <span style={{background:"#f5f3ff",color:"#8B5CF6",borderRadius:6,padding:"2px 8px",fontSize:11,fontFamily:"monospace"}}>{selectedDoc.archiveRef}</span>
                    <span style={{background:"#f1f5f9",color:"#64748b",borderRadius:6,padding:"2px 8px",fontSize:11}}>{selectedDoc.status}</span>
                  </div>
                </div>
                <a href={`https://www.qdl.qa/en/archive/81055/vdc_${selectedDoc.archiveRef?.replace(/\//g,"_")}`} target="_blank" rel="noopener noreferrer" style={{padding:"7px 14px",borderRadius:8,background:"#eff6ff",color:"#3B82F6",border:"0.5px solid #bfdbfe",textDecoration:"none",fontSize:12,flexShrink:0}}>🔗 QDL</a>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:14}}>
                {[
                  {label:"الفصل",value:CHAPTERS_DATA.find(c=>c.id===selectedDoc.chapterId)?.titleAr},
                  {label:"المبحث",value:selectedDoc.section},
                  {label:"النوع",value:selectedDoc.category},
                  {label:"الحالة",value:selectedDoc.status},
                ].map(f=>f.value&&<div key={f.label}><div style={{fontSize:11,color:"#94a3b8",marginBottom:2}}>{f.label}</div><div style={{fontSize:13,fontWeight:500}}>{f.value}</div></div>)}
              </div>
              {selectedDoc.notes && <div style={{background:"#f8fafc",borderRadius:8,padding:12,marginBottom:14,fontSize:13,color:"#475569"}}>{selectedDoc.notes}</div>}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button onClick={()=>handleAI(selectedDoc)} disabled={aiLoading} style={{padding:"8px 16px",borderRadius:8,background:"#7C3AED",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
                  {aiLoading?"⏳ جاري...":"🤖 تحليل بالذكاء الاصطناعي"}
                </button>
                <button onClick={()=>openFootnoteModal(selectedDoc)} style={{padding:"8px 14px",borderRadius:8,background:"#10B981",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>📝 تصدير الهامش</button>
                <button onClick={()=>{setExportSelected([selectedDoc.id]);setPage("export");}} style={{padding:"8px 14px",borderRadius:8,background:"transparent",border:"0.5px solid #cbd5e1",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>📤 تصدير المرجع</button>
              </div>
            </div>
            {aiLoading && <div style={{background:"#faf5ff",borderRadius:12,padding:24,textAlign:"center",border:"0.5px solid #d8b4fe"}}><div style={{fontSize:32}}>🤖</div><div style={{color:"#64748b",marginTop:8}}>جاري التحليل...</div></div>}
            {aiResult && <div style={{background:"#faf5ff",borderRadius:12,padding:20,border:"0.5px solid #d8b4fe"}}>
              <div style={{fontWeight:600,color:"#7C3AED",marginBottom:12,fontSize:13}}>🤖 تحليل الذكاء الاصطناعي</div>
              <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:13,lineHeight:1.8,margin:0}}>{aiResult}</pre>
            </div>}
          </div>
        )}

        {/* ===== URL IMPORT ===== */}
        {page==="url_import" && (
          <div>
            <h1 style={{fontSize:20,fontWeight:700,marginBottom:6}}>🔗 استيراد وثيقة من رابط</h1>
            <p style={{color:"#64748b",fontSize:13,marginBottom:20}}>الصق رابط أي وثيقة من QDL أو الأرشيف البريطاني أو أي موقع أرشيفي وسيستخرج الذكاء الاصطناعي بياناتها تلقائياً</p>
            <div style={{background:"white",borderRadius:12,padding:20,border:"0.5px solid #e2e8f0",marginBottom:16}}>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:13,fontWeight:500,display:"block",marginBottom:6}}>رابط الوثيقة</label>
                <div style={{display:"flex",gap:10}}>
                  <input value={urlImport} onChange={e=>setUrlImport(e.target.value)} placeholder="https://www.qdl.qa/en/archive/..." style={{flex:1,padding:"10px 14px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit"}} onKeyDown={e=>{if(e.key==="Enter")handleUrlImport();}}/>
                  <button onClick={handleUrlImport} disabled={urlLoading} style={{padding:"10px 20px",borderRadius:8,background:"#3B82F6",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:500,fontSize:13,whiteSpace:"nowrap"}}>
                    {urlLoading?"⏳ جاري...":"استخراج البيانات"}
                  </button>
                </div>
              </div>
              <div style={{background:"#f8fafc",borderRadius:8,padding:14,fontSize:12,color:"#64748b"}}>
                <div style={{fontWeight:600,color:"#475569",marginBottom:6}}>المواقع المدعومة:</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {[
                    {name:"Qatar Digital Library","url":"https://www.qdl.qa"},
                    {name:"British National Archives","url":"https://discovery.nationalarchives.gov.uk"},
                    {name:"Internet Archive","url":"https://archive.org"},
                    {name:"Jstor","url":"https://www.jstor.org"},
                    {name:"Google Scholar","url":"https://scholar.google.com"},
                  ].map(s=>(
                    <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" style={{background:"#eff6ff",color:"#3B82F6",borderRadius:6,padding:"3px 10px",textDecoration:"none",fontSize:11}}>🔗 {s.name}</a>
                  ))}
                </div>
              </div>
            </div>
            {urlLoading && <div style={{background:"white",borderRadius:12,padding:30,textAlign:"center",border:"0.5px solid #e2e8f0"}}><div style={{fontSize:36}}>🔍</div><div style={{color:"#64748b",marginTop:8,fontSize:13}}>جاري تحليل الرابط واستخراج البيانات...</div></div>}
            {urlResult && (
              <div style={{background:"#f0fdf4",borderRadius:12,padding:16,border:"0.5px solid #86efac"}}>
                <div style={{fontWeight:600,color:"#16a34a",marginBottom:10,fontSize:13}}>✅ تم استخراج البيانات — ستُضاف للنموذج تلقائياً</div>
                <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:12,background:"white",borderRadius:8,padding:12,border:"0.5px solid #e2e8f0"}}>{JSON.stringify(urlResult,null,2)}</pre>
                <button onClick={()=>setPage("add")} style={{marginTop:10,padding:"8px 18px",borderRadius:8,background:"#16a34a",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>إكمال البيانات وإضافة الوثيقة ←</button>
              </div>
            )}
          </div>
        )}

        {/* ===== ADD ===== */}
        {page==="add" && (() => {
          const SOURCE_TYPES_ADD = ["وثيقة أرشيفية","كتاب عربي","كتاب أجنبي","رسالة ماجستير","أطروحة دكتوراه","بحث علمي","مجلة علمية","مؤتمر علمي","صحيفة","موقع إلكتروني","موسوعة","تقرير رسمي"];
          // map each source type to ordered list of dynamic fields
          const FIELDS_BY_TYPE = {
            "وثيقة أرشيفية": [{k:"archiveRef",l:"الرقم الأرشيفي (IOR)",ph:"IOR/R/15/2/..."},{k:"author",l:"المؤلف / الجهة",ph:"اسم المؤلف"},{k:"year",l:"السنة",ph:"1942",t:"number"}],
            "كتاب عربي":     [{k:"author",l:"المؤلف",ph:"اسم المؤلف"},{k:"edition",l:"الطبعة",ph:"الأولى"},{k:"place",l:"مكان النشر",ph:"بيروت"},{k:"publisher",l:"الناشر",ph:"دار النشر"},{k:"year",l:"السنة",ph:"1990",t:"number"}],
            "كتاب أجنبي":    [{k:"author",l:"المؤلف",ph:"Author Name"},{k:"edition",l:"الطبعة",ph:"1st"},{k:"place",l:"مكان النشر",ph:"London"},{k:"publisher",l:"الناشر",ph:"Routledge"},{k:"year",l:"السنة",ph:"1990",t:"number"}],
            "رسالة ماجستير":  [{k:"author",l:"اسم الباحث",ph:""},{k:"college",l:"الكلية",ph:""},{k:"university",l:"الجامعة",ph:""},{k:"year",l:"السنة",ph:"",t:"number"}],
            "أطروحة دكتوراه": [{k:"author",l:"اسم الباحث",ph:""},{k:"college",l:"الكلية",ph:""},{k:"university",l:"الجامعة",ph:""},{k:"year",l:"السنة",ph:"",t:"number"}],
            "بحث علمي":       [{k:"author",l:"المؤلف",ph:""},{k:"journal",l:"اسم المجلة",ph:""},{k:"volume",l:"المجلد",ph:""},{k:"issue",l:"العدد",ph:""},{k:"year",l:"السنة",ph:"",t:"number"},{k:"pages",l:"الصفحات",ph:"45-67"}],
            "مجلة علمية":     [{k:"author",l:"المؤلف",ph:""},{k:"journal",l:"اسم المجلة",ph:""},{k:"volume",l:"المجلد",ph:""},{k:"issue",l:"العدد",ph:""},{k:"year",l:"السنة",ph:"",t:"number"},{k:"pages",l:"الصفحات",ph:"45-67"}],
            "مؤتمر علمي":     [{k:"author",l:"المؤلف",ph:""},{k:"conference",l:"اسم المؤتمر",ph:""},{k:"place",l:"المكان",ph:""},{k:"year",l:"السنة",ph:"",t:"number"}],
            "صحيفة":          [{k:"newspaper",l:"اسم الصحيفة",ph:""},{k:"issue",l:"رقم العدد",ph:""},{k:"visitDate",l:"التاريخ",ph:"1942-05-10"}],
            "موقع إلكتروني":  [{k:"author",l:"المؤلف",ph:""},{k:"url",l:"الرابط",ph:"https://..."},{k:"visitDate",l:"تاريخ الزيارة",ph:"2025-01-15"}],
            "موسوعة":         [{k:"volume",l:"المجلد",ph:""},{k:"edition",l:"الطبعة",ph:""},{k:"publisher",l:"الناشر",ph:""},{k:"year",l:"السنة",ph:"",t:"number"}],
            "تقرير رسمي":     [{k:"author",l:"المؤلف",ph:""},{k:"agency",l:"الجهة المصدرة",ph:""},{k:"year",l:"السنة",ph:"",t:"number"}],
          };
          const dynFields = FIELDS_BY_TYPE[addForm.category] || FIELDS_BY_TYPE["وثيقة أرشيفية"];
          return (
          <div>
            <h1 style={{fontSize:20,fontWeight:700,marginBottom:6}}>➕ إضافة مصدر</h1>
            <p style={{color:"#64748b",fontSize:12,marginBottom:16}}>اختر نوع المصدر أولاً — ستظهر الحقول المناسبة تلقائياً</p>
            <div style={{background:"white",borderRadius:12,padding:20,border:"0.5px solid #e2e8f0"}}>
              {/* ====== SOURCE TYPE FIRST ====== */}
              <div style={{background:"#eff6ff",borderRadius:10,padding:12,marginBottom:16,border:"0.5px solid #bfdbfe"}}>
                <label style={{fontSize:12,color:"#1e40af",fontWeight:700,display:"block",marginBottom:6}}>🏷️ نوع المصدر *</label>
                <select value={addForm.category} onChange={e=>setAddForm(p=>({...p,category:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"0.5px solid #93c5fd",fontSize:14,fontFamily:"inherit",fontWeight:600,background:"white"}}>
                  {SOURCE_TYPES_ADD.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={{fontSize:12,color:"#64748b",display:"block",marginBottom:4}}>العنوان *</label>
                  <input value={addForm.title} onChange={e=>setAddForm(p=>({...p,title:e.target.value}))} placeholder="عنوان المصدر" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                </div>

                {/* ====== DYNAMIC FIELDS PER TYPE ====== */}
                {dynFields.map(f=>(
                  <div key={f.k}>
                    <label style={{fontSize:12,color:"#64748b",display:"block",marginBottom:4}}>{f.l}</label>
                    <input type={f.t||"text"} value={addForm[f.k]||""} onChange={e=>setAddForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                  </div>
                ))}

                {/* keywords always */}
                <div>
                  <label style={{fontSize:12,color:"#64748b",display:"block",marginBottom:4}}>الكلمات المفتاحية</label>
                  <input value={addForm.keywords} onChange={e=>setAddForm(p=>({...p,keywords:e.target.value}))} placeholder="بريطانيا، نفط، استراتيجية" style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                </div>

                {/* chapter / priority / country common */}
                {[
                  {key:"chapterId",label:"الفصل",opts:[{v:"",l:"اختر فصلاً"},...CHAPTERS_DATA.map(c=>({v:c.id,l:c.titleAr.split(":")[0]}))]},
                  {key:"priority",label:"الأولوية",opts:[{v:"★★★",l:"★★★ اقرأه كاملاً"},{v:"★★",l:"★★ أوراق محددة"},{v:"★",l:"★ احفظ المرجع"}]},
                  {key:"country",label:"الدولة",opts:[{v:"",l:"اختر"},...COUNTRIES.map(c=>({v:c,l:c}))]},
                ].map(f=>(
                  <div key={f.key}>
                    <label style={{fontSize:12,color:"#64748b",display:"block",marginBottom:4}}>{f.label}</label>
                    <select value={addForm[f.key]} onChange={e=>setAddForm(p=>({...p,[f.key]:e.target.value}))} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}}>
                      {f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                ))}
                <div style={{gridColumn:"1/-1"}}>
                  <label style={{fontSize:12,color:"#64748b",display:"block",marginBottom:4}}>المبحث</label>
                  <input value={addForm.section} onChange={e=>setAddForm(p=>({...p,section:e.target.value}))} placeholder="مثال: م1: الموقع الاستراتيجي في خطط الحلفاء" style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={{fontSize:12,color:"#64748b",display:"block",marginBottom:4}}>ملاحظات</label>
                  <textarea value={addForm.notes} onChange={e=>setAddForm(p=>({...p,notes:e.target.value}))} rows={3} placeholder="أهمية المصدر، المحتوى المتوقع..." style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13}}>
                    <input type="checkbox" checked={addForm.isNew} onChange={e=>setAddForm(p=>({...p,isNew:e.target.checked}))}/>
                    مصدر جديد (مُكتشف مؤخراً)
                  </label>
                </div>
              </div>
              <div style={{display:"flex",gap:10,marginTop:16,flexWrap:"wrap"}}>
                <button onClick={handleAddDoc} style={{padding:"9px 22px",borderRadius:8,background:"#3B82F6",color:"white",border:"none",cursor:"pointer",fontWeight:600,fontFamily:"inherit",fontSize:13}}>إضافة المصدر</button>
                {(addForm.category==="كتاب عربي" || addForm.category==="كتاب أجنبي") && (
                  <button onClick={extractBookMetadata} disabled={bookExtractLoading} style={{padding:"9px 16px",borderRadius:8,background:"#fef3c7",color:"#92400e",border:"0.5px solid #fde68a",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600}}>
                    {bookExtractLoading ? "⏳ جاري الاستخراج..." : "🪄 استخراج تلقائي لبيانات الكتاب"}
                  </button>
                )}
                <button onClick={()=>setAddForm(EMPTY_ADD_FORM)} style={{padding:"9px 16px",borderRadius:8,background:"transparent",border:"0.5px solid #cbd5e1",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>مسح</button>
                <button onClick={()=>{setUrlImport(""); setPage("url_import");}} style={{padding:"9px 16px",borderRadius:8,background:"#eff6ff",color:"#3B82F6",border:"0.5px solid #bfdbfe",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>🔗 استيراد من رابط</button>
              </div>
            </div>


          {/* ===== Added Sources List with Delete ===== */}
          {(() => {
            const userAdded = docs.filter(d => !BASE_DOC_IDS.has(d.id));
            if (userAdded.length === 0) return null;
            return (
              <div style={{background:"white",borderRadius:12,padding:20,border:"0.5px solid #e2e8f0",marginTop:16}}>
                <div style={{fontWeight:700,fontSize:15,color:"#1e293b",marginBottom:12}}>📋 المصادر المُضافة ({userAdded.length})</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {userAdded.map(d => (
                    <div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:"0.5px solid #e2e8f0",background:"#f8fafc"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:13,color:"#1e293b",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.title}</div>
                        <div style={{fontSize:11,color:"#64748b"}}>
                          <span style={{background:"#e0f2fe",color:"#0369a1",padding:"1px 6px",borderRadius:4,marginInlineEnd:6}}>{d.category || d.sourceType || "مصدر"}</span>
                          {d.author && <span>{d.author}</span>}{d.year && <span> • {d.year}</span>}
                        </div>
                      </div>
                      <button onClick={()=>setConfirmDialog({title:"تأكيد الحذف",message:"هل أنت متأكد من حذف هذا المصدر؟\nلا يمكن التراجع عن هذا الإجراء.",onConfirm:()=>deleteUserDoc(d.id)})} title="حذف" style={{padding:"6px 10px",borderRadius:6,background:"#fee2e2",color:"#dc2626",border:"none",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          </div>
          );
        })()}

        {/* ===== EXPORT ===== */}
        {page==="export" && (
          <div>
            <h1 style={{fontSize:20,fontWeight:700,marginBottom:16}}>📤 تصدير المراجع الأكاديمية</h1>

            {/* ---- منشئ الصيغة المخصصة ---- */}
            {showCustomBuilder && (
              <div style={{background:"white",borderRadius:12,padding:20,border:"2px solid #7C3AED",marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#7C3AED"}}>
                    ⭐ {editingCustomFmt!==null ? `تعديل: ${customFormats[editingCustomFmt]?.name}` : "إنشاء صيغة توثيق جديدة"}
                  </div>
                  <button onClick={()=>{setShowCustomBuilder(false);setEditingCustomFmt(null);}} style={{background:"transparent",border:"none",fontSize:18,cursor:"pointer",color:"#94a3b8"}}>✕</button>
                </div>

                <div style={{marginBottom:14}}>
                  <label style={{fontSize:12,color:"#64748b",display:"block",marginBottom:4}}>اسم الصيغة * <span style={{color:"#94a3b8"}}>(مثال: صيغة جامعة الموصل)</span></label>
                  <input value={customFmtForm.name} onChange={e=>setCustomFmtForm(p=>({...p,name:e.target.value}))} placeholder="اسم الصيغة..." style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                </div>

                {/* المتغيرات */}
                <div style={{background:"#faf5ff",borderRadius:8,padding:12,marginBottom:14,border:"0.5px solid #e9d5ff"}}>
                  <div style={{fontSize:11,color:"#7C3AED",fontWeight:600,marginBottom:6}}>المتغيرات المتاحة — اضغط لنسخها:</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {["{المؤلف}","{العنوان}","{السنة}","{الرقم_الأرشيفي}","{النوع}","{الفصل}","{الملاحظات}","{الناشر}","{مكان_النشر}","{الجامعة}","{الدرجة}","{اسم_المجلة}","{المجلد}","{العدد}","{الصفحات}","{اسم_الصحيفة}","{التاريخ}","{الرابط}","{تاريخ_الزيارة}","{الجهة}"].map(v=>(
                      <button key={v} onClick={()=>{navigator.clipboard.writeText(v);showNotif(`📋 تم نسخ ${v}`);}} style={{background:"white",color:"#7C3AED",border:"0.5px solid #d8b4fe",borderRadius:5,padding:"2px 7px",fontSize:10,fontFamily:"monospace",cursor:"pointer"}}>{v}</button>
                    ))}
                  </div>
                </div>

                {/* قالب لكل نوع مصدر */}
                <div style={{fontSize:12,color:"#64748b",fontWeight:600,marginBottom:8}}>قالب لكل نوع مصدر:</div>
                <div style={{display:"grid",gap:10}}>
                  {Object.keys(customFmtForm.templates).map(type=>(
                    <div key={type} style={{background:"#f8fafc",borderRadius:8,padding:10,border:"0.5px solid #e2e8f0"}}>
                      <div style={{fontSize:11,fontWeight:600,color:"#475569",marginBottom:5,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{background:"#eff6ff",color:"#3B82F6",borderRadius:4,padding:"1px 6px",fontSize:10}}>{type}</span>
                      </div>
                      <textarea
                        value={customFmtForm.templates[type]}
                        onChange={e=>setCustomFmtForm(p=>({...p,templates:{...p.templates,[type]:e.target.value}}))}
                        rows={2}
                        style={{width:"100%",padding:"6px 10px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:11,fontFamily:"'Courier New',monospace",resize:"vertical",boxSizing:"border-box",direction:"ltr"}}
                      />
                      {/* معاينة */}
                      <div style={{fontSize:10,color:"#94a3b8",marginTop:4,direction:"rtl"}}>
                        معاينة: <span style={{color:"#475569",fontFamily:"inherit"}}>{applyCustomTemplate(customFmtForm.templates[type], {title:"عنوان الوثيقة التجريبية",author:"اسم المؤلف",year:"1942",archiveRef:"IOR/R/15/2/656",category:type})}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{display:"flex",gap:10,marginTop:16}}>
                  <button onClick={saveCustomFormat} style={{padding:"9px 22px",borderRadius:8,background:"#7C3AED",color:"white",border:"none",cursor:"pointer",fontWeight:600,fontFamily:"inherit",fontSize:13}}>
                    💾 {editingCustomFmt!==null ? "تحديث الصيغة" : "حفظ الصيغة"}
                  </button>
                  <button onClick={()=>{setShowCustomBuilder(false);setEditingCustomFmt(null);}} style={{padding:"9px 16px",borderRadius:8,background:"transparent",border:"0.5px solid #cbd5e1",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>إلغاء</button>
                </div>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={{background:"white",borderRadius:12,padding:16,border:"0.5px solid #e2e8f0"}}>

                {/* أزرار الصيغ */}
                <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>صيغة التوثيق</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                  {["Chicago","APA","MLA"].map(f=>(
                    <button key={f} onClick={()=>setExportFormat(f)} style={{padding:"6px 12px",borderRadius:8,border:`2px solid ${exportFormat===f?"#3B82F6":"#e2e8f0"}`,background:exportFormat===f?"#eff6ff":"transparent",color:exportFormat===f?"#3B82F6":"inherit",cursor:"pointer",fontWeight:exportFormat===f?600:400,fontFamily:"inherit",fontSize:12}}>{f}</button>
                  ))}
                  {/* الصيغ المخصصة المحفوظة */}
                  {customFormats.map((cf,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:2}}>
                      <button onClick={()=>setExportFormat(`custom_${i}`)} style={{padding:"6px 12px",borderRadius:"8px 0 0 8px",border:`2px solid ${exportFormat===`custom_${i}`?"#7C3AED":"#e9d5ff"}`,background:exportFormat===`custom_${i}`?"#faf5ff":"transparent",color:exportFormat===`custom_${i}`?"#7C3AED":"#7C3AED",cursor:"pointer",fontWeight:exportFormat===`custom_${i}`?700:400,fontFamily:"inherit",fontSize:12}}>⭐ {cf.name}</button>
                      <button onClick={()=>{setEditingCustomFmt(i);setCustomFmtForm({...customFormats[i],templates:{...customFormats[i].templates}});setShowCustomBuilder(true);}} title="تعديل" style={{padding:"6px 6px",border:`2px solid ${exportFormat===`custom_${i}`?"#7C3AED":"#e9d5ff"}`,borderLeft:"none",background:"transparent",cursor:"pointer",fontSize:11,color:"#7C3AED"}}>✏️</button>
                      <button onClick={()=>deleteCustomFormat(i)} title="حذف" style={{padding:"6px 6px",borderRadius:"0 8px 8px 0",border:`2px solid ${exportFormat===`custom_${i}`?"#7C3AED":"#e9d5ff"}`,borderLeft:"none",background:"transparent",cursor:"pointer",fontSize:11,color:"#dc2626"}}>🗑️</button>
                    </div>
                  ))}
                  {/* زر إضافة صيغة */}
                  <button onClick={()=>{setEditingCustomFmt(null);setShowCustomBuilder(true);}} style={{padding:"6px 12px",borderRadius:8,border:"2px dashed #d8b4fe",background:"transparent",color:"#7C3AED",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>+ صيغة خاصة</button>
                </div>

                {/* وصف الصيغة المختارة */}
                {exportFormat.startsWith("custom_") && (
                  <div style={{background:"#faf5ff",borderRadius:8,padding:8,marginBottom:10,fontSize:11,color:"#7C3AED",border:"0.5px solid #e9d5ff"}}>
                    ⭐ صيغة مخصصة — سيُطبَّق القالب المناسب تلقائياً حسب نوع كل مصدر
                  </div>
                )}

                {(() => {
                  const _q = exportSearch.trim().toLowerCase();
                  const _filteredExportDocs = combinedDocs.filter(d => {
                    if (exportTypeFilter && (d.category||"وثيقة أرشيفية") !== exportTypeFilter) return false;
                    if (!_q) return true;
                    return [d.title, d.author, d.archiveRef].some(v => (v||"").toString().toLowerCase().includes(_q));
                  });
                  return (
                    <>
                      <div style={{marginBottom:10}}>
                        <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:4,color:"#475569"}}>ابحث في المصادر...</label>
                        <input
                          type="text"
                          value={exportSearch}
                          onChange={e=>setExportSearch(e.target.value)}
                          placeholder="ابحث بالعنوان أو المؤلف أو الرقم الأرشيفي"
                          style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit",boxSizing:"border-box",direction:"rtl"}}
                        />
                      </div>
                      <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
                        <button onClick={()=>setExportSelected(_filteredExportDocs.map(d=>d.id))} style={{padding:"5px 10px",borderRadius:6,border:"0.5px solid #cbd5e1",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>تحديد الكل</button>
                        <button onClick={()=>setExportSelected(_filteredExportDocs.filter(d=>d.priority==="★★★").map(d=>d.id))} style={{padding:"5px 10px",borderRadius:6,border:"0.5px solid #cbd5e1",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>★★★ فقط</button>
                        <button onClick={()=>setExportSelected([])} style={{padding:"5px 10px",borderRadius:6,border:"0.5px solid #cbd5e1",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>مسح</button>
                        <select value={exportTypeFilter} onChange={e=>setExportTypeFilter(e.target.value)} style={{marginInlineStart:"auto",padding:"5px 8px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:11,fontFamily:"inherit"}}>
                          <option value="">🏷️ كل الأنواع</option>
                          {["وثيقة أرشيفية","كتاب عربي","كتاب أجنبي","رسالة ماجستير","أطروحة دكتوراه","بحث علمي","مجلة علمية","مؤتمر علمي","صحيفة","موقع إلكتروني","موسوعة","تقرير رسمي","مصدر أولي"].map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div style={{maxHeight:300,overflowY:"auto",borderRadius:8,border:"0.5px solid #f1f5f9"}}>
                        {_filteredExportDocs.length === 0
                          ? <div style={{padding:20,textAlign:"center",color:"#94a3b8",fontSize:12}}>لا توجد نتائج مطابقة</div>
                          : _filteredExportDocs.map(d=>(
                          <div key={d.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderBottom:"0.5px solid #f8fafc",fontSize:11}}>
                            <label style={{display:"flex",alignItems:"center",gap:8,flex:1,cursor:"pointer",minWidth:0}}>
                              <input type="checkbox" checked={exportSelected.includes(d.id)} onChange={()=>setExportSelected(p=>p.includes(d.id)?p.filter(x=>x!==d.id):[...p,d.id])}/>
                              <span style={{background:pBg(d.priority),color:pColor(d.priority),borderRadius:4,padding:"1px 4px",fontSize:9,flexShrink:0}}>{d.priority}</span>
                              <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.title}</span>
                              <span style={{fontSize:9,color:"white",background:"#3B82F6",borderRadius:4,padding:"2px 6px",flexShrink:0,fontWeight:600}}>{d.category||"وثيقة أرشيفية"}</span>
                            </label>
                            <button
                              onClick={(e)=>{e.stopPropagation();openFootnoteModal(d);}}
                              title="توليد مرجع وإضافته للمراجع النهائية"
                              style={{padding:"4px 10px",borderRadius:6,background:"#eff6ff",color:"#3B82F6",border:"0.5px solid #bfdbfe",cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:600,flexShrink:0,whiteSpace:"nowrap"}}>
                              📝 توليد مرجع
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
                <button onClick={()=>{
                  if (!exportSelected.length) { showNotif("اختر وثيقة واحدة على الأقل","error"); return; }
                  const items = combinedDocs.filter(d=>exportSelected.includes(d.id)).map(d=>({doc:d, page:""}));
                  setBulkFootnoteModal({ items, generated: null });
                }} style={{marginTop:12,width:"100%",padding:"9px",borderRadius:8,background:"#3B82F6",color:"white",border:"none",cursor:"pointer",fontWeight:600,fontFamily:"inherit",fontSize:13}}>توليد {exportSelected.length} مرجع</button>
              </div>
              <div style={{background:"white",borderRadius:12,padding:16,border:"0.5px solid #e2e8f0"}}>
                <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>المراجع المُولَّدة</div>
                {exportText
                  ? <>
                    <textarea value={exportText} readOnly rows={16} style={{width:"100%",padding:10,borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:11,fontFamily:"'Courier New',monospace",resize:"vertical",background:"#f8fafc",boxSizing:"border-box",direction:"rtl",lineHeight:1.8}}/>
                    <div style={{display:"flex",gap:8,marginTop:8}}>
                      <button onClick={()=>{navigator.clipboard.writeText(exportText);showNotif("✅ تم النسخ!");}} style={{padding:"7px 14px",borderRadius:8,background:"#10B981",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>📋 نسخ</button>
                    </div>
                  </>
                  : <div style={{color:"#94a3b8",fontSize:13,padding:20,textAlign:"center"}}>اختر الوثائق ثم اضغط "توليد"</div>
                }
              </div>
            </div>
          </div>
        )}

        {/* ===== AI ===== */}
        {page==="ai" && (
          <div>
            <h1 style={{fontSize:20,fontWeight:700,marginBottom:6}}>🤖 المساعد البحثي الذكي</h1>
            <p style={{color:"#64748b",fontSize:13,marginBottom:16}}>اسأل أي سؤال بحثي حول أطروحتك ومصادرها — يعمل بـ {AI_MODELS.find(m=>m.id===aiModel)?.label || aiModel} <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:"#10b981",marginInlineStart:6,verticalAlign:"middle"}} title="متصل"></span></p>
            <div style={{background:"white",borderRadius:12,padding:16,border:"0.5px solid #e2e8f0",marginBottom:14}}>
              <div style={{display:"flex",gap:10,marginBottom:10}}>
                <input ref={aiInputRef} placeholder="مثال: ما هي أبرز وثائق RAF في البحرين؟ أو: حلّل وثائق الفصل الرابع المتعلقة بالنفط" style={{flex:1,padding:"9px 14px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit"}} onKeyDown={e=>{if(e.key==="Enter"&&aiInputRef.current)handleAISearch(aiInputRef.current.value);}}/>
                <button onClick={()=>aiInputRef.current&&handleAISearch(aiInputRef.current.value)} disabled={aiLoading} style={{padding:"9px 18px",borderRadius:8,background:"#7C3AED",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
                  {aiLoading?"⏳":"تحليل →"}
                </button>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["وثائق RAF وسلاح الجو في البحرين","النفط ودوره الاستراتيجي في الحرب","البروباغندا البريطانية في الخليج","فجوات بحثية في مصادر الأطروحة","أفضل وثائق الفصل الثالث"].map(q=>(
                  <button key={q} onClick={()=>{if(aiInputRef.current)aiInputRef.current.value=q;handleAISearch(q);}} style={{padding:"4px 10px",borderRadius:20,border:"0.5px solid #d8b4fe",background:"#faf5ff",color:"#7C3AED",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>{q}</button>
                ))}
              </div>
            </div>
            {aiLoading && <div style={{background:"#faf5ff",borderRadius:12,padding:30,textAlign:"center",border:"0.5px solid #d8b4fe"}}><div style={{fontSize:36}}>🤖</div><div style={{color:"#64748b",marginTop:8}}>جاري التحليل...</div></div>}
            {aiResult && !aiLoading && (
              <div style={{background:"#faf5ff",borderRadius:12,padding:20,border:"0.5px solid #d8b4fe"}}>
                <div style={{fontWeight:600,color:"#7C3AED",marginBottom:12,fontSize:13}}>🤖 تحليل المساعد الذكي</div>
                <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:13,lineHeight:1.9,margin:0}}>{aiResult}</pre>
                <button onClick={()=>{navigator.clipboard.writeText(aiResult);showNotif("✅ تم النسخ!");}} style={{marginTop:12,padding:"7px 14px",borderRadius:8,background:"white",border:"0.5px solid #d8b4fe",color:"#7C3AED",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>📋 نسخ التحليل</button>
              </div>
            )}

            {/* ===== المعرّف الأكاديمي للكيانات ===== */}
            <div style={{background:"white",borderRadius:12,padding:16,border:"0.5px solid #e2e8f0",marginTop:18}}>
              <div style={{fontWeight:700,color:"#0f172a",marginBottom:6,fontSize:14}}>🔎 المعرّف الأكاديمي (شخص / مكان / جهة)</div>
              <p style={{color:"#64748b",fontSize:12,marginBottom:10}}>أدخل اسم شخصية أو مكان أو جهة — سيعطيك المساعد تعريفاً مكثّفاً في ثلاثة أسطر مع مصدر موثوق قابل للتحقق.</p>
              <div style={{display:"flex",gap:10,marginBottom:10}}>
                <input value={entityQuery} onChange={e=>setEntityQuery(e.target.value)} placeholder="مثال: السير تشارلز بلجريف، ميناء البحرين، شركة نفط العراق (IPC)…" style={{flex:1,padding:"9px 14px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit"}} onKeyDown={e=>{if(e.key==="Enter")handleEntityLookup();}}/>
                <button onClick={handleEntityLookup} disabled={entityLoading} style={{padding:"9px 18px",borderRadius:8,background:"#0f172a",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
                  {entityLoading?"⏳":"تعريف →"}
                </button>
              </div>
              {entityLoading && <div style={{color:"#64748b",fontSize:12}}>جاري البحث عن تعريف موثوق…</div>}
              {entityResult && !entityLoading && (
                <div style={{background:"#f8fafc",borderRadius:8,padding:14,border:"0.5px solid #e2e8f0"}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>{entityResult.name || entityQuery}</div>
                  <div style={{whiteSpace:"pre-wrap",fontSize:13,lineHeight:1.9,color:"#1e293b",marginBottom:10}}>{entityResult.definition || "—"}</div>
                  {entityResult.source && entityResult.source.title && entityResult.source.author ? (
                    <div style={{fontSize:12,color:"#475569",borderTop:"0.5px solid #e2e8f0",paddingTop:8}}>
                      <strong>المصدر الأكاديمي{entityResult.sourceType ? ` (${entityResult.sourceType==="book"?"كتاب":entityResult.sourceType==="journal"?"مجلة محكّمة":"رسالة جامعية"})` : ""}:</strong>{" "}
                      {entityResult.source.author} — <em>{entityResult.source.title}</em>
                      {entityResult.source.publisher ? `, ${entityResult.source.publisher}` : ""}
                      {entityResult.source.year ? ` (${entityResult.source.year})` : ""}
                      {entityResult.source.url ? <>{" — "}<a href={entityResult.source.url} target="_blank" rel="noopener noreferrer" style={{color:"#2563eb"}}>{entityResult.source.url}</a></> : null}
                    </div>
                  ) : (
                    <div style={{fontSize:12,color:"#b45309",background:"#fef3c7",borderRadius:6,padding:"8px 10px",borderTop:"0.5px solid #fde68a"}}>
                      ⚠️ No credible academic source available for this entity — لا يوجد مصدر أكاديمي موثّق (كتاب/مجلة محكّمة/رسالة جامعية) قابل للتحقق لهذا الكيان.
                    </div>
                  )}
                  <button onClick={()=>{
                    const txt = `${entityResult.name||entityQuery}\n${entityResult.definition||""}\nالمصدر: ${entityResult.source?.title||""} ${entityResult.source?.url||""}`.trim();
                    navigator.clipboard.writeText(txt); showNotif("✅ تم النسخ!");
                  }} style={{marginTop:10,padding:"6px 12px",borderRadius:8,background:"white",border:"0.5px solid #cbd5e1",color:"#0f172a",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>📋 نسخ</button>
                </div>
              )}
            </div>
          </div>
        )}


        {/* ===== LIBRARY ===== */}
        {page==="library" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <div>
                <h1 style={{fontSize:20,fontWeight:700,marginBottom:4}}>📚 مكتبتي البحثية</h1>
                <p style={{color:"#64748b",fontSize:12}}>ارفع مصادرك (PDF، MD، TXT) أو أضف رابطاً — سيحللها الذكاء الاصطناعي ويصنفها لفصول أطروحتك تلقائياً</p>
              </div>
              <div style={{display:"flex",gap:8}}>
                <input ref={libFileRef} type="file" accept=".pdf,.docx,.md,.txt,.jpg,.jpeg,.png,.webp,.tif,.tiff,.bmp,.gif,image/*" multiple style={{display:"none"}} onChange={e=>handleLibFileUpload(e.target.files)}/>
                <button onClick={()=>libFileRef.current?.click()} disabled={libUploading} style={{padding:"9px 18px",borderRadius:8,background:"#3B82F6",color:"white",border:"none",cursor:"pointer",fontWeight:600,fontFamily:"inherit",fontSize:13}}>
                  {libUploading?"⏳ جاري الرفع...":"📁 رفع ملفات"}
                </button>
              </div>
            </div>

            {/* شريط الرفع السريع */}
            <div style={{background:"white",borderRadius:12,padding:16,border:"2px dashed #bfdbfe",marginBottom:14,textAlign:"center",cursor:"pointer"}} onClick={()=>libFileRef.current?.click()} onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="#3B82F6"}} onDragLeave={e=>e.currentTarget.style.borderColor="#bfdbfe"} onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor="#bfdbfe";handleLibFileUpload(e.dataTransfer.files);}}>
              <div style={{fontSize:36,marginBottom:6}}>📂</div>
              <div style={{fontWeight:600,color:"#3B82F6",marginBottom:4}}>اسحب وأسقط ملفاتك هنا أو اضغط للاختيار</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>يدعم: PDF (مع OCR) • DOCX • MD • TXT • صور ممسوحة (JPG/PNG/TIFF/WebP…) — يمر الكل بنفس الخط: رفع ← OCR ← تحليل ← تصنيف ← ربط بالأطروحة — حجم أقصى 500MB للملف الواحد • حتى 20 ملف دفعة واحدة</div>
              <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>يمكن رفع عدة ملفات دفعة واحدة — كتب، رسائل، بحوث، مقالات، صحف، وثائق...</div>
            </div>

            {/* إضافة من رابط */}
            <div style={{background:"white",borderRadius:12,padding:14,border:"0.5px solid #e2e8f0",marginBottom:14}}>
              <div style={{fontWeight:600,fontSize:12,marginBottom:8,color:"#475569"}}>🔗 إضافة مصدر من رابط إنترنت</div>
              <div style={{display:"flex",gap:8}}>
                <input value={libUrlInput} onChange={e=>setLibUrlInput(e.target.value)} placeholder="https://www.qdl.qa/... أو jstor.org أو archive.org أو أي رابط" style={{flex:1,padding:"8px 12px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}} onKeyDown={e=>{if(e.key==="Enter")handleLibUrlImport();}}/>
                <button onClick={handleLibUrlImport} disabled={libUrlLoading} style={{padding:"8px 16px",borderRadius:8,background:"#10B981",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,whiteSpace:"nowrap"}}>
                  {libUrlLoading?"⏳ جاري...":"إضافة + تحليل"}
                </button>
              </div>
            </div>

            {/* إحصائيات المكتبة */}
            {library.length > 0 && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
                {[
                  {label:"إجمالي المصادر",v:library.length,c:"#3B82F6",i:"📄"},
                  {label:"تم تحليلها",v:library.filter(s=>s.analyzed).length,c:"#10B981",i:"✅"},
                  {label:"عالية الأولوية ★★★",v:library.filter(s=>s.priority==="★★★").length,c:"#F59E0B",i:"⭐"},
                  {label:"بانتظار المراجعة",v:library.filter(s=>!s.analyzed).length,c:"#EF4444",i:"⏳"},
                ].map((s,i)=>(
                  <div key={i} style={{background:"white",borderRadius:10,padding:"10px 12px",border:"0.5px solid #e2e8f0",textAlign:"center"}}>
                    <div style={{fontSize:20,marginBottom:3}}>{s.i}</div>
                    <div style={{fontSize:22,fontWeight:700,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:10,color:"#64748b",marginTop:2}}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* فلاتر */}
            {library.length > 0 && (
              <div style={{background:"white",borderRadius:10,padding:12,border:"0.5px solid #e2e8f0",marginBottom:12,display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:8}}>
                <input placeholder="ابحث في العنوان، المؤلف، الكلمات المفتاحية..." value={libFilter.query} onChange={e=>setLibFilter(p=>({...p,query:e.target.value}))} style={{padding:"7px 10px",borderRadius:7,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}}/>
                <select value={libFilter.chapterId} onChange={e=>setLibFilter(p=>({...p,chapterId:e.target.value}))} style={{padding:"7px 8px",borderRadius:7,border:"0.5px solid #cbd5e1",fontSize:11,fontFamily:"inherit"}}>
                  <option value="">كل الفصول</option>
                  {CHAPTERS_DATA.map(ch=><option key={ch.id} value={ch.id}>{ch.titleAr.split(":")[0]}</option>)}
                </select>
                <select value={libFilter.category} onChange={e=>setLibFilter(p=>({...p,category:e.target.value}))} style={{padding:"7px 8px",borderRadius:7,border:"0.5px solid #cbd5e1",fontSize:11,fontFamily:"inherit"}}>
                  <option value="">كل الأنواع</option>
                  {["كتاب عربي","كتاب أجنبي","رسالة ماجستير","أطروحة دكتوراه","بحث علمي","مجلة علمية","مؤتمر علمي","صحيفة","موقع إلكتروني","موسوعة","وثيقة أرشيفية","تقرير رسمي","مصدر أولي"].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
                <select value={libFilter.priority} onChange={e=>setLibFilter(p=>({...p,priority:e.target.value}))} style={{padding:"7px 8px",borderRadius:7,border:"0.5px solid #cbd5e1",fontSize:11,fontFamily:"inherit"}}>
                  <option value="">كل الأولويات</option>
                  <option value="★★★">★★★ عالية</option>
                  <option value="★★">★★ متوسطة</option>
                  <option value="★">★ منخفضة</option>
                </select>
              </div>
            )}

            {/* قائمة المصادر */}
            {library.length === 0 ? (
              <div style={{background:"white",borderRadius:12,padding:50,textAlign:"center",border:"0.5px solid #e2e8f0"}}>
                <div style={{fontSize:48,marginBottom:12}}>📚</div>
                <div style={{fontWeight:600,fontSize:15,marginBottom:6}}>مكتبتك البحثية فارغة</div>
                <div style={{color:"#64748b",fontSize:13}}>ارفع أول مصدر بحثي لتبدأ التحليل التلقائي</div>
              </div>
            ) : (
              <div style={{display:"grid",gap:10}}>
                {filteredLib.map(src=>{
                  const ch = CHAPTERS_DATA.find(c=>c.id===src.chapterId);
                  const isAnalyzing = libAnalyzing === src.id;
                  return (
                    <div key={src.id} style={{background:"white",borderRadius:12,border:`0.5px solid ${libSelected?.id===src.id?"#3B82F6":"#e2e8f0"}`,overflow:"hidden"}}>
                      {/* رأس البطاقة */}
                      <div onClick={()=>setLibSelected(libSelected?.id===src.id?null:src)} style={{padding:"12px 16px",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start"}}>
                        <div style={{fontSize:28,flexShrink:0}}>
                          {src.fileType==="pdf"?"📕":src.fileType==="url"?"🌐":src.fileType==="md"?"📝":"📄"}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>{src.title || src.fileName}</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",fontSize:11,color:"#64748b"}}>
                            {src.author && <span>👤 {src.author}</span>}
                            {src.year && <span>📅 {src.year}</span>}
                            {src.language && <span>🌐 {src.language}</span>}
                            {src.sourceType && <span style={{background:"#f1f5f9",borderRadius:4,padding:"1px 6px"}}>{src.sourceType}</span>}
                          </div>
                          <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                            {src.priority && <span style={{background:src.priority==="★★★"?"#dcfce7":src.priority==="★★"?"#fef9c3":"#f1f5f9",color:src.priority==="★★★"?"#16a34a":src.priority==="★★"?"#ca8a04":"#94a3b8",borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:700}}>{src.priority}</span>}
                            {ch && <span style={{background:`${ch.color}15`,color:ch.color,borderRadius:4,padding:"1px 6px",fontSize:10}}>ف{src.chapterId}: {ch.titleAr.split(":")[0]}</span>}
                            <span style={{background:src.analyzed?"#f0fdf4":"#fff7ed",color:src.analyzed?"#16a34a":"#f59e0b",borderRadius:4,padding:"1px 6px",fontSize:10}}>
                              {isAnalyzing?"⏳ جاري التحليل...":src.status}
                            </span>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:4,flexShrink:0}}>
                          <button onClick={e=>{e.stopPropagation();setConfirmDialog({title:"تأكيد الحذف",message:"هل أنت متأكد من حذف هذا المصدر؟\nلا يمكن التراجع عن هذا الإجراء.",onConfirm:()=>deleteLibSrc(src.id)});}} title="حذف" style={{padding:"4px 8px",borderRadius:6,background:"#fee2e2",color:"#dc2626",border:"none",cursor:"pointer",fontSize:11}}>🗑️</button>
                        </div>
                      </div>

                      {/* تفاصيل موسّعة */}
                      {libSelected?.id===src.id && (
                        <div style={{borderTop:"0.5px solid #f1f5f9",padding:"14px 16px",background:"#fafafa"}}>
                          {isAnalyzing && (
                            <div style={{textAlign:"center",padding:20,color:"#7C3AED"}}>
                              <div style={{fontSize:28,marginBottom:6}}>🤖</div>
                              <div style={{fontWeight:500}}>جاري تحليل المصدر بالذكاء الاصطناعي...</div>
                            </div>
                          )}
                          {!isAnalyzing && (
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                              {/* ملخص */}
                              {/* تصنيف الذكاء الاصطناعي داخل هيكل الأطروحة */}
                              {(src.sectionName || src.subSectionName || src.classificationReason) && (
                                <div style={{gridColumn:"1/-1",background:"#ecfeff",borderRadius:8,padding:12,border:"0.5px solid #a5f3fc"}}>
                                  <div style={{fontSize:11,fontWeight:600,color:"#0e7490",marginBottom:6}}>🎯 تصنيف الذكاء الاصطناعي</div>
                                  {src.chapterName && <div style={{fontSize:12,marginBottom:3}}><b>الفصل:</b> {src.chapterName}</div>}
                                  {src.sectionName && <div style={{fontSize:12,marginBottom:3}}><b>المبحث:</b> {src.sectionName}</div>}
                                  {src.subSectionName && <div style={{fontSize:12,marginBottom:3}}><b>الفقرة:</b> {src.subSectionName}</div>}
                                  {src.classificationReason && <div style={{fontSize:11,color:"#475569",marginTop:5}}><b>السبب:</b> {src.classificationReason}</div>}
                                  {src.classificationConfidence && <div style={{fontSize:10,color:"#0e7490",marginTop:3}}>مستوى الثقة: {src.classificationConfidence}</div>}
                                </div>
                              )}
                              {/* ملخص */}
                              {src.summary && (
                                <div style={{gridColumn:"1/-1",background:"#eff6ff",borderRadius:8,padding:12,border:"0.5px solid #bfdbfe"}}>
                                  <div style={{fontSize:11,fontWeight:600,color:"#3B82F6",marginBottom:5}}>📋 ملخص المصدر</div>
                                  <div style={{fontSize:12,lineHeight:1.8}}>{src.summary}</div>
                                </div>
                              )}
                              {/* الأهمية */}
                              {src.whyImportant && (
                                <div style={{background:"#f0fdf4",borderRadius:8,padding:12,border:"0.5px solid #86efac"}}>
                                  <div style={{fontSize:11,fontWeight:600,color:"#16a34a",marginBottom:5}}>⭐ لماذا مهم</div>
                                  <div style={{fontSize:12,lineHeight:1.7}}>{src.whyImportant}</div>
                                </div>
                              )}
                              {/* كيفية الاستخدام */}
                              {src.howToUse && (
                                <div style={{background:"#faf5ff",borderRadius:8,padding:12,border:"0.5px solid #e9d5ff"}}>
                                  <div style={{fontSize:11,fontWeight:600,color:"#7C3AED",marginBottom:5}}>✍️ كيف تستخدمه</div>
                                  <div style={{fontSize:12,lineHeight:1.7}}>{src.howToUse}</div>
                                </div>
                              )}
                              {/* الصفحات المهمة */}
                              {src.importantPages && (
                                <div style={{background:"#fffbeb",borderRadius:8,padding:12,border:"0.5px solid #fde68a"}}>
                                  <div style={{fontSize:11,fontWeight:600,color:"#f59e0b",marginBottom:5}}>📄 الصفحات المهمة</div>
                                  <div style={{fontSize:13,fontWeight:600}}>{src.importantPages}</div>
                                </div>
                              )}
                              {/* المباحث */}
                              {src.sections?.length>0 && (
                                <div style={{background:"#f8fafc",borderRadius:8,padding:12,border:"0.5px solid #e2e8f0"}}>
                                  <div style={{fontSize:11,fontWeight:600,color:"#475569",marginBottom:5}}>📌 المباحث ذات الصلة</div>
                                  {src.sections.map((s,i)=><div key={i} style={{fontSize:11,padding:"2px 0",color:"#64748b"}}>• {s}</div>)}
                                </div>
                              )}
                              {/* الكلمات المفتاحية */}
                              {src.keywords?.length>0 && (
                                <div style={{gridColumn:"1/-1"}}>
                                  <div style={{fontSize:11,fontWeight:600,color:"#475569",marginBottom:5}}>🔑 الكلمات المفتاحية</div>
                                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                    {src.keywords.map((k,i)=><span key={i} style={{background:"#f1f5f9",borderRadius:5,padding:"2px 8px",fontSize:11}}>{k}</span>)}
                                  </div>
                                </div>
                              )}
                              {/* تعديل يدوي */}
                              <div style={{gridColumn:"1/-1",background:"white",borderRadius:8,padding:12,border:"0.5px solid #e2e8f0"}}>
                                <div style={{fontSize:11,fontWeight:600,color:"#475569",marginBottom:8}}>✏️ تعديل يدوي</div>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                                  <div>
                                    <label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:3}}>الفصل</label>
                                    <select value={src.chapterId||""} onChange={e=>updateLibSrc(src.id,{chapterId:e.target.value?parseInt(e.target.value):null})} style={{width:"100%",padding:"5px 8px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:11,fontFamily:"inherit"}}>
                                      <option value="">اختر فصلاً</option>
                                      {CHAPTERS_DATA.map(ch=><option key={ch.id} value={ch.id}>{ch.titleAr.split(":")[0]}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:3}}>الأولوية</label>
                                    <select value={src.priority||"★★"} onChange={e=>updateLibSrc(src.id,{priority:e.target.value})} style={{width:"100%",padding:"5px 8px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:11,fontFamily:"inherit"}}>
                                      <option value="★★★">★★★ عالية — اقرأه كاملاً</option>
                                      <option value="★★">★★ متوسطة — صفحات محددة</option>
                                      <option value="★">★ منخفضة — احفظ المرجع</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:3}}>الصفحات المهمة</label>
                                    <input value={src.importantPages||""} onChange={e=>updateLibSrc(src.id,{importantPages:e.target.value})} placeholder="مثال: 45-67، 102، 230" style={{width:"100%",padding:"5px 8px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:11,fontFamily:"inherit",boxSizing:"border-box"}}/>
                                  </div>
                                  <div>
                                    <label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:3}}>نوع المصدر</label>
                                    <select value={src.sourceType||""} onChange={e=>updateLibSrc(src.id,{sourceType:e.target.value})} style={{width:"100%",padding:"5px 8px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:11,fontFamily:"inherit"}}>
                                      {["كتاب عربي","كتاب أجنبي","رسالة ماجستير","أطروحة دكتوراه","بحث علمي","مجلة علمية","مؤتمر علمي","صحيفة","موقع إلكتروني","موسوعة","وثيقة أرشيفية","تقرير رسمي","مصدر أولي"].map(t=><option key={t} value={t}>{t}</option>)}
                                    </select>
                                  </div>
                                  <div style={{gridColumn:"1/-1"}}>
                                    <label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:3}}>ملاحظات إضافية</label>
                                    <textarea value={src.howToUse||""} onChange={e=>updateLibSrc(src.id,{howToUse:e.target.value})} rows={2} style={{width:"100%",padding:"5px 8px",borderRadius:6,border:"0.5px solid #cbd5e1",fontSize:11,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
                                  </div>
                                </div>
                                <button onClick={()=>showNotif("✅ تم حفظ التعديلات")} style={{marginTop:8,padding:"6px 14px",borderRadius:7,background:"#3B82F6",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11}}>حفظ التعديلات</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== CARDS — بطاقات وجذاذات البحث الآلي ===== */}
        {page==="cards" && (
          <div>
            {/* رأس الصفحة */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
              <div>
                <h1 style={{fontSize:20,fontWeight:700,marginBottom:4}}>🗃️ بطاقات وجذاذات المباحث</h1>
                <p style={{color:"#64748b",fontSize:12}}>بطاقات بحثية ذكية تجمع الاقتباسات والشواهد المصدرية حول حدث أو موضوع تاريخي محدد</p>
              </div>
              <button
                onClick={()=>{ setShowCardForm(true); setCardAiResult(""); setCardForm({title:"",topic:"",date:"",chapterId:"",sectionId:"",tags:"",notes:""}); }}
                style={{padding:"9px 18px",borderRadius:8,background:"#1e3a5f",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600}}>
                ＋ بطاقة جديدة
              </button>
            </div>

            {/* ===== نموذج إنشاء البطاقة ===== */}
            {showCardForm && (
              <div style={{background:"white",borderRadius:14,border:"2px solid #1e3a5f",padding:22,marginBottom:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:15,color:"#1e3a5f"}}>🗃️ إنشاء بطاقة بحثية جديدة</div>
                  <button onClick={()=>setShowCardForm(false)} style={{background:"#f1f5f9",border:"none",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:12,color:"#64748b",fontFamily:"inherit"}}>إغلاق</button>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                  {/* عنوان البطاقة */}
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:500}}>عنوان البطاقة / الجذاذة *</label>
                    <input
                      value={cardForm.title}
                      onChange={e=>setCardForm(p=>({...p,title:e.target.value}))}
                      placeholder="مثال: أزمة التموين والإعاشة عام 1942 في البحرين"
                      style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}
                    />
                  </div>
                  {/* الموضوع */}
                  <div>
                    <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:500}}>الموضوع / الكلمة المفتاحية</label>
                    <input
                      value={cardForm.topic}
                      onChange={e=>setCardForm(p=>({...p,topic:e.target.value}))}
                      placeholder="مثال: تموين، إعاشة، حصار، نفط..."
                      style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}
                    />
                  </div>
                  {/* التاريخ */}
                  <div>
                    <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:500}}>التاريخ / الحقبة</label>
                    <input
                      value={cardForm.date}
                      onChange={e=>setCardForm(p=>({...p,date:e.target.value}))}
                      placeholder="مثال: 1942 أو 1939-1945"
                      style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}
                    />
                  </div>
                  {/* الفصل */}
                  <div>
                    <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:500}}>الفصل المرتبط</label>
                    <select
                      value={cardForm.chapterId}
                      onChange={e=>setCardForm(p=>({...p,chapterId:e.target.value,sectionId:""}))}
                      style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}}>
                      <option value="">كل الفصول</option>
                      {chapters.map(ch=><option key={ch.id} value={ch.id}>{ch.titleAr.split(":")[0]}</option>)}
                    </select>
                  </div>
                  {/* المبحث */}
                  {cardForm.chapterId && (
                    <div>
                      <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:500}}>المبحث</label>
                      <select
                        value={cardForm.sectionId}
                        onChange={e=>setCardForm(p=>({...p,sectionId:e.target.value}))}
                        style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}}>
                        <option value="">اختر مبحثاً</option>
                        {(chapters.find(c=>c.id===parseInt(cardForm.chapterId))?.sections||[])
                          .filter(s=>!s.id.includes("a")&&!s.id.includes("b")&&!s.id.includes("c"))
                          .map(s=><option key={s.id} value={s.id}>{s.title}</option>)}
                      </select>
                    </div>
                  )}
                  {/* الوسوم */}
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:500}}>وسوم التصنيف (افصل بـ ،)</label>
                    <input
                      value={cardForm.tags}
                      onChange={e=>setCardForm(p=>({...p,tags:e.target.value}))}
                      placeholder="مثال: نفط، بريطانيا، استراتيجية، البحرين"
                      style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}
                    />
                  </div>
                  {/* ملاحظات */}
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:500}}>ملاحظات أو اقتباسات أولية</label>
                    <textarea
                      value={cardForm.notes}
                      onChange={e=>setCardForm(p=>({...p,notes:e.target.value}))}
                      placeholder="أي ملاحظات أو اقتباسات أولية تريد إضافتها للبطاقة..."
                      rows={3}
                      style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}
                    />
                  </div>
                </div>

                {/* أزرار التوليد والحفظ */}
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <button
                    onClick={generateSmartCard}
                    disabled={cardAiLoading || !cardForm.title.trim()}
                    style={{padding:"9px 20px",borderRadius:8,background:"#7C3AED",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600}}>
                    {cardAiLoading ? "⏳ جاري التوليد الذكي..." : "🤖 توليد البطاقة بالذكاء الاصطناعي"}
                  </button>
                  {cardAiResult && (
                    <button
                      onClick={saveCard}
                      style={{padding:"9px 18px",borderRadius:8,background:"#10B981",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600}}>
                      💾 حفظ البطاقة
                    </button>
                  )}
                  <button
                    onClick={saveCard}
                    style={{padding:"9px 16px",borderRadius:8,background:"transparent",border:"0.5px solid #cbd5e1",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
                    حفظ بدون ذكاء اصطناعي
                  </button>
                </div>

                {/* نتيجة الذكاء الاصطناعي */}
                {cardAiLoading && (
                  <div style={{marginTop:16,background:"#faf5ff",borderRadius:10,padding:24,textAlign:"center",border:"0.5px solid #d8b4fe"}}>
                    <div style={{fontSize:36,marginBottom:8}}>🤖</div>
                    <div style={{color:"#7C3AED",fontWeight:500}}>جاري تجميع المصادر وصياغة البطاقة التاريخية...</div>
                  </div>
                )}
                {cardAiResult && !cardAiLoading && (
                  <div style={{marginTop:16,background:"#faf5ff",borderRadius:10,padding:18,border:"0.5px solid #d8b4fe"}}>
                    <div style={{fontWeight:600,color:"#7C3AED",marginBottom:10,fontSize:13}}>🤖 محتوى البطاقة المُولَّد — راجعه ثم احفظ</div>
                    <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:12,lineHeight:1.9,margin:0,color:"#1e293b"}}>{cardAiResult}</pre>
                  </div>
                )}
              </div>
            )}

            {/* ===== فلاتر البطاقات ===== */}
            {cards.length > 0 && (
              <div style={{background:"white",borderRadius:10,padding:12,border:"0.5px solid #e2e8f0",marginBottom:14,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                <input
                  placeholder="ابحث في البطاقات..."
                  value={cardSearchQ}
                  onChange={e=>setCardSearchQ(e.target.value)}
                  style={{flex:1,minWidth:180,padding:"7px 12px",borderRadius:7,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}}
                />
                <select
                  value={cardFilterCh}
                  onChange={e=>setCardFilterCh(e.target.value)}
                  style={{padding:"7px 10px",borderRadius:7,border:"0.5px solid #cbd5e1",fontSize:11,fontFamily:"inherit"}}>
                  <option value="">كل الفصول</option>
                  {chapters.map(ch=><option key={ch.id} value={ch.id}>{ch.titleAr.split(":")[0]}</option>)}
                </select>
                <span style={{fontSize:12,color:"#64748b"}}>{filteredCards.length} بطاقة</span>
              </div>
            )}

            {/* ===== شبكة البطاقات ===== */}
            {cards.length === 0 ? (
              <div style={{background:"white",borderRadius:12,padding:50,textAlign:"center",border:"0.5px solid #e2e8f0"}}>
                <div style={{fontSize:48,marginBottom:12}}>🗃️</div>
                <div style={{fontWeight:600,fontSize:15,marginBottom:6}}>لا توجد بطاقات بعد</div>
                <div style={{color:"#64748b",fontSize:13,marginBottom:16}}>أنشئ بطاقتك الأولى لتجميع الشواهد التاريخية حول موضوع محدد</div>
                <button
                  onClick={()=>{ setShowCardForm(true); setCardAiResult(""); }}
                  style={{padding:"9px 20px",borderRadius:8,background:"#1e3a5f",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
                  ＋ إنشاء أول بطاقة
                </button>
              </div>
            ) : cardView === "detail" && selectedCard ? (
              /* ===== عرض تفاصيل البطاقة ===== */
              <div>
                <button
                  onClick={()=>{ setCardView("grid"); setSelectedCard(null); }}
                  style={{marginBottom:14,padding:"7px 14px",borderRadius:8,border:"0.5px solid #cbd5e1",background:"transparent",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>
                  ← العودة لشبكة البطاقات
                </button>
                <div style={{background:"white",borderRadius:14,border:"0.5px solid #e2e8f0",overflow:"hidden"}}>
                  {/* رأس البطاقة */}
                  <div style={{background:"linear-gradient(135deg,#1e3a5f,#2d5a8e)",color:"white",padding:"18px 22px"}}>
                    <div style={{fontWeight:700,fontSize:17,marginBottom:6}}>{selectedCard.title}</div>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:11,opacity:0.85}}>
                      {selectedCard.date     && <span>📅 {selectedCard.date}</span>}
                      {selectedCard.topic    && <span>🔍 {selectedCard.topic}</span>}
                      {selectedCard.chapterId && <span>📖 {chapters.find(c=>c.id===selectedCard.chapterId)?.titleAr?.split(":")[0]}</span>}
                      <span>📆 أُنشئت: {selectedCard.createdAt}</span>
                    </div>
                    {selectedCard.tags?.length>0 && (
                      <div style={{marginTop:8,display:"flex",gap:4,flexWrap:"wrap"}}>
                        {selectedCard.tags.map((t,i)=>(
                          <span key={i} style={{background:"rgba(255,255,255,0.2)",borderRadius:4,padding:"1px 8px",fontSize:11}}>#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{padding:"18px 22px"}}>
                    {/* الملاحظات اليدوية */}
                    {selectedCard.notes && (
                      <div style={{background:"#fffbeb",borderRadius:9,padding:14,marginBottom:16,border:"0.5px solid #fde68a"}}>
                        <div style={{fontSize:11,fontWeight:600,color:"#92400e",marginBottom:6}}>📝 ملاحظات وجذاذات أولية</div>
                        <div style={{fontSize:13,lineHeight:1.8,color:"#1e293b"}}>{selectedCard.notes}</div>
                      </div>
                    )}
                    {/* محتوى الذكاء الاصطناعي */}
                    {selectedCard.aiContent && (
                      <div style={{background:"#faf5ff",borderRadius:9,padding:16,marginBottom:16,border:"0.5px solid #d8b4fe"}}>
                        <div style={{fontWeight:600,color:"#7C3AED",marginBottom:10,fontSize:13}}>🤖 التحليل والسياق التاريخي المُولَّد</div>
                        <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:13,lineHeight:1.9,margin:0}}>{selectedCard.aiContent}</pre>
                      </div>
                    )}
                    {/* الوثائق المرتبطة */}
                    {selectedCard.relatedDocIds?.length>0 && (
                      <div>
                        <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"#475569"}}>📄 الوثائق الأرشيفية المرتبطة ({selectedCard.relatedDocIds.length})</div>
                        <div style={{display:"grid",gap:6}}>
                          {selectedCard.relatedDocIds.map(dId=>{
                            const d = docs.find(doc=>doc.id===dId);
                            if (!d) return null;
                            return (
                              <div key={dId} style={{display:"flex",gap:8,padding:"8px 12px",background:"#f8fafc",borderRadius:7,border:"0.5px solid #e2e8f0",alignItems:"flex-start"}}>
                                <span style={{background:pBg(d.priority),color:pColor(d.priority),borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:700,flexShrink:0,marginTop:2}}>{d.priority}</span>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.title}</div>
                                  <div style={{fontSize:10,color:"#8B5CF6",fontFamily:"monospace"}}>{d.archiveRef}</div>
                                </div>
                                <button
                                  onClick={()=>openFootnoteModal(d)}
                                  style={{padding:"3px 8px",borderRadius:5,background:"#faf5ff",border:"0.5px solid #d8b4fe",color:"#7C3AED",cursor:"pointer",fontSize:10,fontFamily:"inherit",flexShrink:0}}>
                                  📝 هامش
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* أزرار الإجراءات */}
                    <div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap"}}>
                      <button
                        onClick={()=>{navigator.clipboard.writeText(`${selectedCard.title}\n\n${selectedCard.aiContent||""}\n\n${selectedCard.notes||""}`).then(()=>showNotif("✅ تم نسخ محتوى البطاقة"));}}
                        style={{padding:"7px 16px",borderRadius:8,background:"#eff6ff",color:"#3B82F6",border:"0.5px solid #bfdbfe",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>
                        📋 نسخ المحتوى
                      </button>
                      <button
                        onClick={()=>deleteCard(selectedCard.id)}
                        style={{padding:"7px 14px",borderRadius:8,background:"#fee2e2",color:"#dc2626",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>
                        🗑️ حذف البطاقة
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ===== شبكة البطاقات الرئيسية ===== */
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
                {filteredCards.map(card=>{
                  const ch = chapters.find(c=>c.id===card.chapterId);
                  return (
                    <div
                      key={card.id}
                      style={{background:"white",borderRadius:12,border:"0.5px solid #e2e8f0",overflow:"hidden",cursor:"pointer",transition:"all 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}
                      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.10)";e.currentTarget.style.transform="translateY(-2px)";}}
                      onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)";e.currentTarget.style.transform="translateY(0)";}}
                      onClick={()=>{ setSelectedCard(card); setCardView("detail"); }}>
                      {/* شريط لون الفصل */}
                      <div style={{height:4,background:ch?.color||"#94a3b8"}}/>
                      <div style={{padding:"14px 16px"}}>
                        <div style={{fontWeight:700,fontSize:14,marginBottom:6,color:"#1e293b",lineHeight:1.4}}>{card.title}</div>
                        {/* معلومات مختصرة */}
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8,fontSize:11,color:"#64748b"}}>
                          {card.date   && <span style={{background:"#f1f5f9",borderRadius:4,padding:"1px 6px"}}>📅 {card.date}</span>}
                          {card.topic  && <span style={{background:"#f1f5f9",borderRadius:4,padding:"1px 6px"}}>🔍 {card.topic}</span>}
                          {ch          && <span style={{background:`${ch.color}15`,color:ch.color,borderRadius:4,padding:"1px 6px"}}>{ch.titleAr.split(":")[0]}</span>}
                        </div>
                        {/* وسوم */}
                        {card.tags?.length>0 && (
                          <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:8}}>
                            {card.tags.slice(0,4).map((t,i)=>(
                              <span key={i} style={{background:"#eff6ff",color:"#3B82F6",borderRadius:4,padding:"1px 7px",fontSize:10}}>#{t}</span>
                            ))}
                            {card.tags.length>4 && <span style={{fontSize:10,color:"#94a3b8"}}>+{card.tags.length-4}</span>}
                          </div>
                        )}
                        {/* معاينة المحتوى */}
                        {(card.aiContent||card.notes) && (
                          <div style={{fontSize:11,color:"#64748b",lineHeight:1.6,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical"}}>
                            {(card.aiContent||card.notes).substring(0,150)}...
                          </div>
                        )}
                        {/* ذيل البطاقة */}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,paddingTop:10,borderTop:"0.5px solid #f1f5f9"}}>
                          <span style={{fontSize:10,color:"#94a3b8"}}>📄 {card.relatedDocIds?.length||0} وثيقة مرتبطة</span>
                          <div style={{display:"flex",gap:4}}>
                            {card.aiContent && <span style={{fontSize:10,background:"#faf5ff",color:"#7C3AED",borderRadius:4,padding:"1px 6px"}}>🤖 AI</span>}
                            <span style={{fontSize:10,color:"#94a3b8"}}>{card.createdAt}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== TRANSLATOR — بوابة ترجمة وتكشيف المصادر الأجنبية ===== */}
        {page==="translator" && (
          <div>
            <div style={{marginBottom:20}}>
              <h1 style={{fontSize:20,fontWeight:700,marginBottom:4}}>🌐 مستعرض وترجمة الوثائق الأجنبية</h1>
              <p style={{color:"#64748b",fontSize:12}}>ترجمة فورية للوثائق الأجنبية (إنجليزية/فرنسية/ألمانية) إلى العربية التاريخية الرصينة مع استخراج النقاط الجوهرية</p>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>

              {/* ===== العمود الأيمن: رفع النص ===== */}
              <div>
                <div style={{background:"white",borderRadius:12,padding:18,border:"0.5px solid #e2e8f0",marginBottom:12}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:12,color:"#1e293b"}}>📂 رفع الوثيقة الأجنبية</div>

                  {/* منطقة رفع الملف */}
                  <div
                    style={{border:"2px dashed #bfdbfe",borderRadius:10,padding:"20px 14px",textAlign:"center",cursor:"pointer",marginBottom:12,background:"#f8fafc"}}
                    onClick={()=>translatorFileRef.current?.click()}
                    onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="#3B82F6";}}
                    onDragLeave={e=>{e.currentTarget.style.borderColor="#bfdbfe";}}
                    onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor="#bfdbfe";handleTranslatorFileUpload(e.dataTransfer.files[0]);}}>
                    <input
                      ref={translatorFileRef}
                      type="file"
                      accept=".txt,.md,.pdf,.jpg,.jpeg,.png,.webp"
                      style={{display:"none"}}
                      onChange={e=>handleTranslatorFileUpload(e.target.files[0])}
                    />
                    <div style={{fontSize:28,marginBottom:6}}>📄</div>
                    <div style={{fontSize:12,fontWeight:500,color:"#3B82F6",marginBottom:3}}>
                      {translatorFileName ? `✅ ${translatorFileName}` : "اسحب ملف TXT / MD / PDF / صورة هنا أو اضغط للاختيار"}
                    </div>
                    <div style={{fontSize:10,color:"#94a3b8"}}>PDF نصي يُستخرج تلقائياً • PDF ممسوح + صور (JPG/PNG/WEBP) عبر OCR بالذكاء الاصطناعي</div>
                  </div>

                  {/* لغة الوثيقة */}
                  <div style={{marginBottom:10}}>
                    <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:500}}>لغة الوثيقة الأصلية</label>
                    <select
                      value={translatorLang}
                      onChange={e=>setTranslatorLang(e.target.value)}
                      style={{width:"100%",padding:"7px 10px",borderRadius:7,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"inherit"}}>
                      {["إنجليزية","فرنسية","ألمانية","إيطالية","روسية","فارسية","عثمانية"].map(l=>(
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  {/* حقل النص */}
                  <div style={{marginBottom:12}}>
                    <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:500}}>النص الأجنبي (الصق هنا أو ارفع ملفاً)</label>
                    <textarea
                      value={translatorText}
                      onChange={e=>setTranslatorText(e.target.value)}
                      placeholder="الصق هنا نص الوثيقة الأجنبية (من PDF أو أي مصدر)..."
                      rows={10}
                      style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:12,fontFamily:"'Courier New',monospace",resize:"vertical",boxSizing:"border-box",direction:"ltr",lineHeight:1.7}}
                    />
                    {translatorText && (
                      <div style={{fontSize:10,color:"#94a3b8",marginTop:3}}>
                        {translatorText.length} حرف ({Math.ceil(translatorText.split(/\s+/).length)} كلمة)
                        {translatorText.length > 4000 && <span style={{color:"#f59e0b"}}> — سيُترجم أول 4000 حرف فقط</span>}
                      </div>
                    )}
                  </div>

                  {/* زر الترجمة */}
                  <button
                    onClick={runTranslation}
                    disabled={translatorLoading || !translatorText.trim()}
                    style={{width:"100%",padding:"10px",borderRadius:8,background:translatorLoading||!translatorText.trim()?"#94a3b8":"#1e3a5f",color:"white",border:"none",cursor:translatorLoading||!translatorText.trim()?"not-allowed":"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600}}>
                    {translatorLoading ? "⏳ جاري الترجمة والتحليل..." : "🌐 ترجمة وتكشيف الوثيقة"}
                  </button>
                </div>

                {/* ===== بيانات الوثيقة المستنتجة ===== */}
                {translatorDocMeta && (
                  <div style={{background:"white",borderRadius:12,padding:16,border:"0.5px solid #e2e8f0"}}>
                    <div style={{fontWeight:600,fontSize:12,marginBottom:10,color:"#475569"}}>📋 بيانات الوثيقة المستنتجة تلقائياً</div>
                    <div style={{display:"grid",gap:6}}>
                      {[
                        {label:"العنوان المستنتج", value:translatorDocMeta.estimatedTitle},
                        {label:"المؤلف / الجهة",   value:translatorDocMeta.author},
                        {label:"التاريخ",           value:translatorDocMeta.date},
                        {label:"نوع الوثيقة",       value:translatorDocMeta.docType},
                        {label:"الفصل المقترح",     value:translatorDocMeta.suggestedChapter},
                      ].map(f=>f.value&&(
                        <div key={f.label} style={{display:"flex",gap:6}}>
                          <span style={{fontSize:10,color:"#94a3b8",minWidth:100,flexShrink:0}}>{f.label}</span>
                          <span style={{fontSize:12,fontWeight:500,flex:1}}>{f.value}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:8,marginTop:12}}>
                      <button
                        onClick={saveTranslation}
                        style={{padding:"6px 14px",borderRadius:7,background:"#10B981",color:"white",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>
                        💾 حفظ في سجل الترجمات
                      </button>
                      <button
                        onClick={()=>{
                          setAddForm(p=>({...p,title:translatorDocMeta.estimatedTitle||"",author:translatorDocMeta.author||"",year:translatorDocMeta.date||"",notes:translatorText.substring(0,200)}));
                          setPage("add");
                          showNotif("تم نقل البيانات لنموذج الإضافة — أكمل البيانات");
                        }}
                        style={{padding:"6px 14px",borderRadius:7,background:"#eff6ff",color:"#3B82F6",border:"0.5px solid #bfdbfe",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>
                        ➕ إضافة للأرشيف
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ===== العمود الأيسر: النتائج ===== */}
              <div>
                {/* حالة التحميل */}
                {translatorLoading && (
                  <div style={{background:"white",borderRadius:12,padding:40,border:"0.5px solid #e2e8f0",textAlign:"center"}}>
                    <div style={{fontSize:40,marginBottom:12}}>🌐</div>
                    <div style={{fontWeight:600,color:"#1e3a5f",marginBottom:6}}>جاري الترجمة...</div>
                    <div style={{fontSize:12,color:"#64748b"}}>يترجم النص ويستخرج النقاط الجوهرية بلغة تاريخية رصينة</div>
                  </div>
                )}

                {/* الترجمة */}
                {translatedResult && !translatorLoading && (
                  <div style={{background:"white",borderRadius:12,border:"0.5px solid #e2e8f0",marginBottom:14,overflow:"hidden"}}>
                    <div style={{background:"#1e3a5f",color:"white",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontWeight:600,fontSize:13}}>🌐 الترجمة العربية الرصينة</div>
                      <button
                        onClick={()=>{navigator.clipboard.writeText(translatedResult).then(()=>showNotif("✅ تم نسخ الترجمة"));}}
                        style={{padding:"3px 10px",borderRadius:5,background:"rgba(255,255,255,0.2)",border:"none",color:"white",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
                        📋 نسخ
                      </button>
                    </div>
                    <div style={{padding:16,maxHeight:320,overflowY:"auto"}}>
                      <p style={{fontSize:13,lineHeight:2,color:"#1e293b",margin:0,direction:"rtl"}}>{translatedResult}</p>
                    </div>
                  </div>
                )}

                {/* النقاط الجوهرية */}
                {keyPoints.length>0 && !translatorLoading && (
                  <div style={{background:"white",borderRadius:12,border:"0.5px solid #e2e8f0",overflow:"hidden"}}>
                    <div style={{background:"#7C3AED",color:"white",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontWeight:600,fontSize:13}}>⭐ النقاط الجوهرية والأفكار المفتاحية</div>
                      <button
                        onClick={()=>{
                          const text = keyPoints.map((p,i)=>`${i+1}. [${p.importance}] ${p.point}\n   الفصل: ${p.chapter}`).join("\n\n");
                          navigator.clipboard.writeText(text).then(()=>showNotif("✅ تم نسخ النقاط"));
                        }}
                        style={{padding:"3px 10px",borderRadius:5,background:"rgba(255,255,255,0.2)",border:"none",color:"white",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
                        📋 نسخ
                      </button>
                    </div>
                    <div style={{padding:14}}>
                      {keyPoints.map((kp,i)=>(
                        <div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:i<keyPoints.length-1?"0.5px solid #f1f5f9":"none",alignItems:"flex-start"}}>
                          <div style={{background:pBg(kp.importance),color:pColor(kp.importance),borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,flexShrink:0,minWidth:28,textAlign:"center"}}>{kp.rank}</div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:500,lineHeight:1.6,marginBottom:3}}>{kp.point}</div>
                            <div style={{display:"flex",gap:6,alignItems:"center"}}>
                              <span style={{fontSize:10,background:"#eff6ff",color:"#3B82F6",borderRadius:4,padding:"1px 6px"}}>📖 {kp.chapter}</span>
                              <span style={{background:pBg(kp.importance),color:pColor(kp.importance),borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:600}}>{kp.importance}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* رسالة ترحيبية */}
                {!translatorLoading && !translatedResult && (
                  <div style={{background:"white",borderRadius:12,padding:36,border:"0.5px solid #e2e8f0",textAlign:"center"}}>
                    <div style={{fontSize:40,marginBottom:10}}>🌐</div>
                    <div style={{fontWeight:600,fontSize:14,marginBottom:6,color:"#1e3a5f"}}>بوابة الترجمة الأرشيفية</div>
                    <div style={{fontSize:12,color:"#64748b",lineHeight:1.8}}>
                      ارفع ملف TXT/MD أو الصق نص الوثيقة الأجنبية<br/>
                      ستحصل على ترجمة بالعربية التاريخية الرصينة<br/>
                      مع استخراج النقاط الجوهرية ومقترح الفصل المرتبط
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ===== سجل الترجمات المحفوظة ===== */}
            {savedTranslations.length > 0 && (
              <div style={{background:"white",borderRadius:12,border:"0.5px solid #e2e8f0",overflow:"hidden"}}>
                <div style={{padding:"12px 18px",background:"#f8fafc",borderBottom:"0.5px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontWeight:600,fontSize:13}}>📁 سجل الترجمات المحفوظة ({savedTranslations.length})</div>
                </div>
                {savedTranslations.map(tr=>(
                  <div key={tr.id} style={{padding:"12px 18px",borderBottom:"0.5px solid #f1f5f9",display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:500,fontSize:13,marginBottom:3}}>{tr.docMeta?.estimatedTitle||tr.fileName}</div>
                      <div style={{fontSize:11,color:"#64748b",display:"flex",gap:8,flexWrap:"wrap"}}>
                        {tr.docMeta?.date  && <span>📅 {tr.docMeta.date}</span>}
                        {tr.docMeta?.docType && <span>📄 {tr.docMeta.docType}</span>}
                        <span>💾 {tr.savedAt}</span>
                        <span>⭐ {tr.keyPoints?.length||0} نقطة جوهرية</span>
                      </div>
                      {tr.originalText && (
                        <div style={{fontSize:10,color:"#94a3b8",marginTop:3,fontFamily:"monospace",direction:"ltr",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {tr.originalText}...
                        </div>
                      )}
                    </div>
                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                      <button
                        onClick={()=>{ setSelectedTranslation(tr); setTranslatedResult(tr.translation); setKeyPoints(tr.keyPoints||[]); setTranslatorDocMeta(tr.docMeta); setTranslatorText(""); setTranslatorFileName(tr.fileName||""); }}
                        style={{padding:"4px 10px",borderRadius:6,background:"#eff6ff",color:"#3B82F6",border:"none",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
                        عرض
                      </button>
                      <button
                        onClick={()=>deleteTranslation(tr.id)}
                        style={{padding:"4px 8px",borderRadius:6,background:"#fee2e2",color:"#dc2626",border:"none",cursor:"pointer",fontSize:11}}>
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== DEFENSE — محاكي مناقشة الأطروحة ===== */}
        {page==="defense" && (
          <div>
            <div style={{marginBottom:20}}>
              <h1 style={{fontSize:20,fontWeight:700,marginBottom:4}}>🎓 محاكي مناقشة الأطروحة</h1>
              <p style={{color:"#64748b",fontSize:12}}>
                يتقمّص الذكاء الاصطناعي دور رئيس لجنة مناقشة صارم — اختر الفصل لتبدأ جلسة تدريبية أكاديمية حقيقية · يعمل بـ {AI_MODELS.find(m=>m.id===aiModel)?.label || aiModel} <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:"#10b981",marginInlineStart:4,verticalAlign:"middle"}}></span>
              </p>
            </div>

            {!defenseActive ? (
              /* ===== شاشة اختيار الفصل ===== */
              <div>
                <div style={{background:"#fffbeb",borderRadius:10,padding:14,border:"0.5px solid #fde68a",marginBottom:18,fontSize:12,color:"#78350f"}}>
                  <strong>💡 كيف تعمل المحاكاة؟</strong> يقرأ النظام مصادر الفصل الذي تختاره ويحلل تنوع مصادرك، ثم يُشغّل أستاذاً دكتوراً صارماً يوجّه لك أسئلة ونقوداً علمية حقيقية كما يحدث في قاعة المناقشة بجامعة الموصل. أجب بالعربية الفصحى الأكاديمية.
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
                  {chapters.map(ch => {
                    const chDocs     = combinedDocs.filter(d => d.chapterId === ch.id);
                    const diversity  = calcDiversityForChapter(ch.id);
                    const progress   = calcChapterProgress(ch.id);
                    return (
                      <div
                        key={ch.id}
                        style={{background:"white",borderRadius:14,border:`2px solid ${ch.color}30`,borderTop:`4px solid ${ch.color}`,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
                        <div style={{fontWeight:700,fontSize:13,color:ch.color,marginBottom:10,lineHeight:1.4}}>{ch.titleAr}</div>
                        {/* إحصاءات الفصل */}
                        <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                          <span style={{fontSize:11,background:`${ch.color}10`,color:ch.color,borderRadius:5,padding:"2px 8px"}}>📄 {chDocs.length} مصدر</span>
                          <span style={{fontSize:11,background:"#f1f5f9",color:"#475569",borderRadius:5,padding:"2px 8px"}}>📈 {progress}% إنجاز</span>
                        </div>
                        {/* تنوع المصادر */}
                        {diversity.length > 0 && (
                          <div style={{marginBottom:12}}>
                            <div style={{fontSize:10,color:"#94a3b8",marginBottom:5}}>توزيع المصادر:</div>
                            <div style={{height:6,background:"#f1f5f9",borderRadius:3,overflow:"hidden",display:"flex",marginBottom:5}}>
                              {diversity.map((dc,i)=>(
                                <div key={i} style={{height:"100%",width:`${dc.pct}%`,background:dc.color}} title={`${dc.label}: ${dc.pct}%`}/>
                              ))}
                            </div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                              {diversity.map((dc,i)=>(
                                <span key={i} style={{fontSize:9,background:`${dc.color}12`,color:dc.color,borderRadius:3,padding:"0 5px"}}>{dc.label.split(" ")[0]}: {dc.pct}%</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {chDocs.length === 0 ? (
                          <div style={{fontSize:11,color:"#94a3b8",fontStyle:"italic",marginBottom:10}}>لا توجد مصادر مضافة لهذا الفصل بعد</div>
                        ) : null}
                        <button
                          onClick={()=>startDefenseSession(ch)}
                          disabled={chDocs.length === 0}
                          style={{width:"100%",padding:"9px",borderRadius:8,background:chDocs.length>0?ch.color:"#94a3b8",color:"white",border:"none",cursor:chDocs.length>0?"pointer":"not-allowed",fontFamily:"inherit",fontSize:12,fontWeight:600}}>
                          🎓 بدء محاكاة مناقشة هذا الفصل
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ===== واجهة المحادثة ===== */
              <div>
                {/* شريط معلومات الجلسة */}
                <div style={{background:defenseChapter?.color||"#1e3a5f",color:"white",borderRadius:12,padding:"12px 18px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>🎓 جلسة مناقشة نشطة</div>
                    <div style={{fontSize:11,opacity:0.85}}>{defenseChapter?.titleAr}</div>
                  </div>
                  <button
                    onClick={endDefenseSession}
                    style={{padding:"6px 14px",borderRadius:7,background:"rgba(255,255,255,0.2)",border:"none",color:"white",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>
                    إنهاء الجلسة ✕
                  </button>
                </div>

                {/* تعليمات الجلسة */}
                <div style={{background:"#fffbeb",borderRadius:8,padding:"8px 14px",marginBottom:12,fontSize:11,color:"#78350f",border:"0.5px solid #fde68a"}}>
                  أنت الآن أمام لجنة المناقشة — أجب بالعربية الفصحى الأكاديمية. اللجنة ستنتقد مصادرك وتختبر منهجيتك. استعد!
                </div>

                {/* صندوق المحادثة */}
                <div style={{background:"white",borderRadius:12,border:"0.5px solid #e2e8f0",overflow:"hidden",marginBottom:12}}>
                  <div style={{maxHeight:460,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>

                    {defenseMessages.map((msg, i) => (
                      <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",flexDirection:msg.role==="committee"?"row":"row-reverse"}}>
                        {/* أيقونة */}
                        <div style={{
                          width:36,height:36,borderRadius:"50%",flexShrink:0,
                          background:msg.role==="committee"?"#1e3a5f":"#10B981",
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:16
                        }}>
                          {msg.role==="committee" ? "👨‍🏫" : "🎓"}
                        </div>
                        {/* فقاعة الرسالة */}
                        <div style={{
                          maxWidth:"75%",
                          background:msg.role==="committee"?"#f8fafc":"#f0fdf4",
                          borderRadius:msg.role==="committee"?"4px 12px 12px 12px":"12px 4px 12px 12px",
                          padding:"10px 14px",
                          border:`0.5px solid ${msg.role==="committee"?"#e2e8f0":"#86efac"}`,
                        }}>
                          <div style={{fontSize:11,fontWeight:600,color:msg.role==="committee"?"#1e3a5f":"#16a34a",marginBottom:5}}>
                            {msg.role==="committee" ? "🎓 رئيس لجنة المناقشة" : "👨‍💼 الباحث: اسعد النعيمي"}
                          </div>
                          <div style={{fontSize:13,lineHeight:1.85,color:"#1e293b",direction:"rtl"}}>{msg.text}</div>
                          <div style={{fontSize:10,color:"#94a3b8",marginTop:5,textAlign:"left"}}>{msg.ts}</div>
                        </div>
                      </div>
                    ))}

                    {/* حالة التحميل */}
                    {defenseLoading && (
                      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                        <div style={{width:36,height:36,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>👨‍🏫</div>
                        <div style={{background:"#f8fafc",borderRadius:"4px 12px 12px 12px",padding:"10px 16px",border:"0.5px solid #e2e8f0"}}>
                          <div style={{display:"flex",gap:4,alignItems:"center"}}>
                            <div style={{width:7,height:7,borderRadius:"50%",background:"#94a3b8",animation:"pulse 1.4s infinite"}}/>
                            <div style={{width:7,height:7,borderRadius:"50%",background:"#94a3b8",animation:"pulse 1.4s 0.2s infinite"}}/>
                            <div style={{width:7,height:7,borderRadius:"50%",background:"#94a3b8",animation:"pulse 1.4s 0.4s infinite"}}/>
                            <span style={{fontSize:11,color:"#64748b",marginRight:6}}>اللجنة تصوغ سؤالها...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={defenseChatEndRef}/>
                  </div>

                  {/* حقل الإجابة */}
                  <div style={{borderTop:"0.5px solid #e2e8f0",padding:14,background:"#fafafa"}}>
                    <div style={{display:"flex",gap:8}}>
                      <textarea
                        value={defenseInput}
                        onChange={e=>setDefenseInput(e.target.value)}
                        onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendDefenseReply(); } }}
                        placeholder="اكتب إجابتك أمام اللجنة بالعربية الفصحى... (Enter للإرسال، Shift+Enter لسطر جديد)"
                        rows={3}
                        style={{flex:1,padding:"9px 12px",borderRadius:8,border:"0.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit",resize:"vertical",direction:"rtl",lineHeight:1.7}}
                        disabled={defenseLoading}
                      />
                      <button
                        onClick={sendDefenseReply}
                        disabled={defenseLoading || !defenseInput.trim()}
                        style={{padding:"9px 16px",borderRadius:8,background:defenseLoading||!defenseInput.trim()?"#94a3b8":"#1e3a5f",color:"white",border:"none",cursor:defenseLoading||!defenseInput.trim()?"not-allowed":"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,alignSelf:"flex-end"}}>
                        إرسال →
                      </button>
                    </div>
                    <div style={{fontSize:10,color:"#94a3b8",marginTop:5}}>
                      💡 نصيحة: استند في إجابتك إلى مصادرك المحددة — اللجنة ستتحقق من ذلك
                    </div>
                  </div>
                </div>

                {/* نسخ سجل المناقشة */}
                {defenseMessages.length > 2 && (
                  <button
                    onClick={()=>{
                      const log = defenseMessages.map(m => `[${m.role==="committee"?"اللجنة":"الباحث"}] ${m.text}`).join("\n\n---\n\n");
                      navigator.clipboard.writeText(log).then(()=>showNotif("✅ تم نسخ سجل المناقشة"));
                    }}
                    style={{padding:"8px 16px",borderRadius:8,background:"white",border:"0.5px solid #e2e8f0",cursor:"pointer",fontFamily:"inherit",fontSize:12,color:"#475569"}}>
                    📋 نسخ سجل المناقشة كاملاً
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== BIBLIOGRAPHY — قائمة المصادر والمراجع النهائية ===== */}
        {page==="bibliography" && (
          <div>
            {/* رأس الصفحة */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
              <div>
                <h1 style={{fontSize:20,fontWeight:700,marginBottom:4}}>📋 قائمة المصادر والمراجع النهائية للرسالة</h1>
                <p style={{color:"#64748b",fontSize:12}}>
                  تُضاف المراجع تلقائياً عند نسخ أي هامش — الاسم مُحوَّل (اللقب، الاسم الأول) — مرتّبة أبجدياً داخل كل قسم
                </p>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button
                  onClick={copyFullBibliography}
                  disabled={bibliography.length===0}
                  style={{padding:"9px 20px",borderRadius:8,background:bibliography.length>0?"#3B82F6":"#94a3b8",color:"white",border:"none",cursor:bibliography.length>0?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13,fontWeight:600}}>
                  📋 نسخ القائمة كاملة
                </button>
                <button
                  onClick={()=>{ if(window.confirm("هل تريد مسح جميع المراجع من القائمة؟")) saveBibliography([]); }}
                  disabled={bibliography.length===0}
                  style={{padding:"9px 14px",borderRadius:8,background:"transparent",border:"0.5px solid #fca5a5",color:"#dc2626",cursor:bibliography.length>0?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13}}>
                  🗑️ مسح الكل
                </button>
              </div>
            </div>

            {/* إحصائيات */}
            {bibliography.length>0 && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:16}}>
                {BIBO_SECTIONS_ORDER.map(sec=>{
                  const cnt = bibliography.filter(b=>b.section===sec).length;
                  if(!cnt) return null;
                  return (
                    <div key={sec} style={{background:"white",borderRadius:10,padding:"10px 12px",border:"0.5px solid #e2e8f0",textAlign:"center"}}>
                      <div style={{fontSize:20,fontWeight:700,color:"#3B82F6"}}>{cnt}</div>
                      <div style={{fontSize:10,color:"#64748b",marginTop:2}}>{sec}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* القائمة مقسّمة حسب الأقسام */}
            {bibliography.length===0 ? (
              <div style={{background:"white",borderRadius:12,padding:50,textAlign:"center",border:"0.5px solid #e2e8f0"}}>
                <div style={{fontSize:48,marginBottom:12}}>📋</div>
                <div style={{fontWeight:600,fontSize:15,marginBottom:6}}>القائمة فارغة</div>
                <div style={{color:"#64748b",fontSize:13}}>عند نسخ أي هامش من أي مصدر، يُضاف تلقائياً هنا</div>
                <div style={{color:"#94a3b8",fontSize:12,marginTop:6}}>يمكنك أيضاً الضغط على زر "📝 تصدير الهامش" من داخل أي مصدر</div>
              </div>
            ) : (
              <div style={{display:"grid",gap:16}}>
                {BIBO_SECTIONS_ORDER.map(sec=>{
                  const grouped = getBibGrouped();
                  const entries = grouped[sec] || [];
                  if(!entries.length) return null;
                  return (
                    <div key={sec} style={{background:"white",borderRadius:12,border:"0.5px solid #e2e8f0",overflow:"hidden"}}>
                      {/* رأس القسم */}
                      <div style={{padding:"12px 18px",background:"#1e3a5f",color:"white",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{fontWeight:700,fontSize:14}}>◆ {sec}</div>
                        <span style={{background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"2px 10px",fontSize:11}}>{entries.length} مرجع</span>
                      </div>
                      {/* مداخل القسم */}
                      <div style={{padding:"4px 0"}}>
                        {entries.map((b,i)=>(
                          <div key={b.id} style={{padding:"12px 18px",borderBottom:i<entries.length-1?"0.5px solid #f1f5f9":"none",display:"flex",gap:12,alignItems:"flex-start"}}>
                            <span style={{color:"#94a3b8",fontSize:12,fontWeight:600,minWidth:24,textAlign:"center",marginTop:2}}>{i+1}</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,lineHeight:1.9,color:"#1e293b",direction:"rtl"}}>{b.bibEntry}</div>
                              <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap",fontSize:10,color:"#94a3b8"}}>
                                <span>🏷️ {b.category}</span>
                                <span>📅 أُضيف: {b.addedAt}</span>
                              </div>
                            </div>
                            <div style={{display:"flex",gap:4,flexShrink:0}}>
                              <button
                                onClick={()=>{navigator.clipboard.writeText(b.bibEntry).then(()=>showNotif("✅ تم نسخ المرجع"));}}
                                title="نسخ"
                                style={{padding:"4px 8px",borderRadius:5,background:"#eff6ff",color:"#3B82F6",border:"none",cursor:"pointer",fontSize:11}}>
                                📋
                              </button>
                              <button
                                onClick={()=>setConfirmDialog({title:"تأكيد الحذف",message:"هل أنت متأكد من حذف هذا المرجع من القائمة النهائية؟",onConfirm:()=>removeFromBibliography(b.id)})}
                                title="حذف"
                                style={{padding:"4px 8px",borderRadius:5,background:"#fee2e2",color:"#dc2626",border:"none",cursor:"pointer",fontSize:11}}>
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* تلميح الاستخدام */}
            <div style={{marginTop:16,background:"#fffbeb",borderRadius:10,padding:14,border:"0.5px solid #fde68a",fontSize:12,color:"#78350f"}}>
              <strong>💡 كيف تعمل القائمة:</strong> عند الضغط على "📝 تصدير الهامش" من أي مصدر وإدخال رقم الصفحة ثم "نسخ الهامش"، يُنسخ الهامش للحافظة ويُضاف المصدر هنا تلقائياً بصيغة قائمة المراجع (بدون رقم الصفحة، مع تقديم اللقب، مرتّب أبجدياً).
            </div>
          </div>
        )}

        {/* ===== THESAURUS — قاموس المؤرخ للمرادفات والسبك ===== */}
        {page==="thesaurus" && (
          <div>
            {/* رأس الصفحة */}
            <div style={{marginBottom:20}}>
              <h1 style={{fontSize:20,fontWeight:700,marginBottom:4}}>📜 قاموس المؤرخ للمرادفات والسبك</h1>
              <p style={{color:"#64748b",fontSize:12}}>
                أداة لغوية أكاديمية لمعالجة تكرار الكلمات وترقية التراكيب إلى مستوى الكتابة التاريخية الرصينة
              </p>
            </div>

            {/* تبويبا الخيارين */}
            <div style={{display:"flex",gap:0,marginBottom:20,background:"white",borderRadius:12,padding:4,border:"0.5px solid #e2e8f0",width:"fit-content"}}>
              <button
                onClick={()=>setThesActiveTab("synonyms")}
                style={{
                  padding:"8px 20px",borderRadius:9,border:"none",cursor:"pointer",
                  fontFamily:"inherit",fontSize:13,fontWeight:thesActiveTab==="synonyms"?700:400,
                  background:thesActiveTab==="synonyms"?"#1e3a5f":"transparent",
                  color:thesActiveTab==="synonyms"?"white":"#64748b",
                  transition:"all 0.2s"
                }}>
                🔤 مستكشف المرادفات الأكاديمية
              </button>
              <button
                onClick={()=>setThesActiveTab("upgrade")}
                style={{
                  padding:"8px 20px",borderRadius:9,border:"none",cursor:"pointer",
                  fontFamily:"inherit",fontSize:13,fontWeight:thesActiveTab==="upgrade"?700:400,
                  background:thesActiveTab==="upgrade"?"#1e3a5f":"transparent",
                  color:thesActiveTab==="upgrade"?"white":"#64748b",
                  transition:"all 0.2s"
                }}>
                ✍️ ترقية التراكيب القصيرة
              </button>
            </div>

            {/* ===== الخيار الأول: مستكشف المرادفات ===== */}
            {thesActiveTab==="synonyms" && (
              <div style={{display:"grid",gridTemplateColumns:"340px 1fr",gap:16,alignItems:"start"}}>

                {/* العمود الأيمن: الإدخال والتاريخ */}
                <div>
                  <div style={{background:"white",borderRadius:12,padding:18,border:"0.5px solid #e2e8f0",marginBottom:12}}>
                    <div style={{fontWeight:600,fontSize:13,marginBottom:14,color:"#1e293b"}}>🔤 اكتب الكلمة المكررة</div>
                    <input
                      value={thesWordInput}
                      onChange={e=>{ setThesWordInput(e.target.value); setThesWordResult(null); }}
                      onKeyDown={e=>{ if(e.key==="Enter") runThesaurusSearch(); }}
                      placeholder="مثال: أدى، قال، حدث، أهمية، كبير..."
                      style={{width:"100%",padding:"10px 14px",borderRadius:8,border:"1.5px solid #cbd5e1",fontSize:14,fontFamily:"inherit",boxSizing:"border-box",outline:"none",marginBottom:12,direction:"rtl"}}
                    />
                    <button
                      onClick={runThesaurusSearch}
                      disabled={thesWordLoading || !thesWordInput.trim()}
                      style={{width:"100%",padding:"10px",borderRadius:8,background:thesWordLoading||!thesWordInput.trim()?"#94a3b8":"#1e3a5f",color:"white",border:"none",cursor:thesWordLoading||!thesWordInput.trim()?"not-allowed":"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,marginBottom:10}}>
                      {thesWordLoading ? "⏳ جارٍ البحث..." : "🔍 استكشاف المرادفات"}
                    </button>

                    {/* اقتراحات سريعة */}
                    <div style={{marginTop:8}}>
                      <div style={{fontSize:11,color:"#94a3b8",marginBottom:6}}>كلمات شائعة التكرار في الكتابة التاريخية:</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {["أدى","قال","حدث","أهمية","كبير","مهم","تأثير","دور","يشير","أسفر"].map(w=>(
                          <button key={w} onClick={()=>{ setThesWordInput(w); setThesWordResult(null); }} style={{padding:"3px 9px",borderRadius:5,background:"#f1f5f9",border:"0.5px solid #e2e8f0",color:"#475569",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>{w}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* سجل الكلمات السابقة */}
                  {thesWordHistory.length > 0 && (
                    <div style={{background:"white",borderRadius:12,padding:14,border:"0.5px solid #e2e8f0"}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#475569",marginBottom:8}}>🕐 آخر الكلمات المبحوثة</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {thesWordHistory.map((h,i)=>(
                          <button key={i} onClick={()=>{ setThesWordInput(h.word); setThesWordResult(h.result); }} style={{padding:"3px 10px",borderRadius:5,background:"#eff6ff",border:"0.5px solid #bfdbfe",color:"#3B82F6",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>{h.word}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* العمود الأيسر: النتائج */}
                <div>
                  {/* حالة التحميل */}
                  {thesWordLoading && (
                    <div style={{background:"white",borderRadius:12,padding:40,border:"0.5px solid #e2e8f0",textAlign:"center"}}>
                      <div style={{fontSize:40,marginBottom:10}}>📚</div>
                      <div style={{fontWeight:600,color:"#1e3a5f",marginBottom:4}}>يستشير المعاجم الأكاديمية...</div>
                      <div style={{fontSize:12,color:"#64748b"}}>يبحث عن مرادفات أكاديمية رصينة تليق بمستوى الدكتوراه</div>
                    </div>
                  )}

                  {/* نتائج المرادفات */}
                  {thesWordResult && !thesWordLoading && (
                    <div>
                      {/* رأس النتيجة */}
                      <div style={{background:"#1e3a5f",borderRadius:"12px 12px 0 0",padding:"14px 18px",color:"white"}}>
                        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                          <div style={{fontSize:20,fontWeight:800}}>{thesWordResult.word}</div>
                          {thesWordResult.category && <span style={{background:"rgba(255,255,255,0.2)",borderRadius:5,padding:"2px 10px",fontSize:11}}>{thesWordResult.category}</span>}
                          {thesWordResult.semanticField && <span style={{background:"rgba(255,255,255,0.15)",borderRadius:5,padding:"2px 10px",fontSize:11}}>الحقل: {thesWordResult.semanticField}</span>}
                        </div>
                        {thesWordResult.avoidNote && (
                          <div style={{marginTop:8,fontSize:11,opacity:0.8,lineHeight:1.6,background:"rgba(255,255,255,0.07)",borderRadius:7,padding:"6px 10px"}}>
                            💡 {thesWordResult.avoidNote}
                          </div>
                        )}
                      </div>

                      {/* شبكة المرادفات */}
                      <div style={{background:"white",borderRadius:"0 0 12px 12px",border:"0.5px solid #e2e8f0",padding:"4px 0",overflow:"hidden"}}>
                        {(thesWordResult.synonyms||[]).map((syn, i) => {
                          const regColor = REGISTER_COLOR[syn.register] || "#64748b";
                          return (
                            <div key={i} style={{padding:"13px 18px",borderBottom:i<(thesWordResult.synonyms||[]).length-1?"0.5px solid #f1f5f9":"none",display:"flex",gap:12,alignItems:"flex-start"}}>
                              {/* رقم + الكلمة */}
                              <div style={{flexShrink:0,width:30,height:30,borderRadius:"50%",background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#475569"}}>{i+1}</div>
                              <div style={{flex:1}}>
                                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}>
                                  {/* الكلمة المرادفة */}
                                  <span style={{fontSize:16,fontWeight:700,color:"#1e293b"}}>{syn.word}</span>
                                  {/* نوع الصيغة */}
                                  {syn.formType && <span style={{fontSize:10,background:"#f1f5f9",color:"#64748b",borderRadius:4,padding:"1px 7px"}}>{syn.formType}</span>}
                                  {/* مستوى السجل */}
                                  {syn.register && <span style={{fontSize:10,background:`${regColor}15`,color:regColor,borderRadius:4,padding:"1px 7px",fontWeight:600}}>{syn.register}</span>}
                                  {/* زر نسخ */}
                                  <button
                                    onClick={()=>{navigator.clipboard.writeText(syn.word).then(()=>showNotif(`✅ تم نسخ: ${syn.word}`));}}
                                    style={{padding:"2px 8px",borderRadius:4,background:"#eff6ff",color:"#3B82F6",border:"none",cursor:"pointer",fontSize:10,fontFamily:"inherit",marginRight:"auto"}}>
                                    نسخ
                                  </button>
                                </div>
                                {/* السياق */}
                                {syn.context && (
                                  <div style={{fontSize:12,color:"#64748b",marginBottom:5,display:"flex",gap:5,alignItems:"flex-start"}}>
                                    <span style={{flexShrink:0,color:"#94a3b8"}}>السياق:</span>
                                    <span>{syn.context}</span>
                                  </div>
                                )}
                                {/* المثال */}
                                {syn.example && (
                                  <div style={{background:"#f8fafc",borderRadius:7,padding:"7px 10px",fontSize:12,lineHeight:1.7,color:"#334155",borderRight:"3px solid #e2e8f0"}}>
                                    <span style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:2}}>مثال:</span>
                                    {syn.example}
                                    <button
                                      onClick={()=>{navigator.clipboard.writeText(syn.example).then(()=>showNotif("✅ تم نسخ المثال"));}}
                                      style={{display:"block",marginTop:5,padding:"2px 8px",borderRadius:4,background:"white",color:"#64748b",border:"0.5px solid #e2e8f0",cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>
                                      نسخ المثال
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* زر نسخ الكل */}
                      <div style={{marginTop:10,display:"flex",gap:8}}>
                        <button
                          onClick={()=>{
                            const text = (thesWordResult.synonyms||[]).map((s,i)=>`${i+1}. ${s.word} (${s.register||""}) — ${s.context||""}\n   مثال: ${s.example||""}`).join("\n\n");
                            navigator.clipboard.writeText(`مرادفات "${thesWordResult.word}":\n\n${text}`).then(()=>showNotif("✅ تم نسخ قائمة المرادفات كاملة"));
                          }}
                          style={{padding:"7px 16px",borderRadius:8,background:"white",border:"0.5px solid #e2e8f0",cursor:"pointer",fontFamily:"inherit",fontSize:12,color:"#475569"}}>
                          📋 نسخ القائمة كاملة
                        </button>
                      </div>
                    </div>
                  )}

                  {/* رسالة ترحيبية */}
                  {!thesWordLoading && !thesWordResult && (
                    <div style={{background:"white",borderRadius:12,padding:40,border:"0.5px solid #e2e8f0",textAlign:"center"}}>
                      <div style={{fontSize:44,marginBottom:10}}>🔤</div>
                      <div style={{fontWeight:600,fontSize:14,marginBottom:6,color:"#1e3a5f"}}>مستكشف المرادفات الأكاديمية</div>
                      <div style={{fontSize:12,color:"#64748b",lineHeight:1.8}}>
                        أدخل أي كلمة تتكرر في كتابتك<br/>
                        ستحصل على 8 مرادفات أكاديمية فصيحة<br/>
                        مع السياق الأنسب ومثال جملة كاملة لكل منها
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== الخيار الثاني: ترقية التراكيب القصيرة ===== */}
            {thesActiveTab==="upgrade" && (
              <div style={{display:"grid",gridTemplateColumns:"340px 1fr",gap:16,alignItems:"start"}}>

                {/* العمود الأيمن: الإدخال والتاريخ */}
                <div>
                  <div style={{background:"white",borderRadius:12,padding:18,border:"0.5px solid #e2e8f0",marginBottom:12}}>
                    <div style={{fontWeight:600,fontSize:13,marginBottom:4,color:"#1e293b"}}>✍️ أدخل التركيب أو الجملة القصيرة</div>
                    <div style={{fontSize:11,color:"#94a3b8",marginBottom:12}}>حتى 12 كلمة — سيُرقَّى أسلوبها إلى مستوى الدكتوراه</div>
                    <textarea
                      value={thesPhrase}
                      onChange={e=>{ setThesPhrase(e.target.value); setThesPhraseResult(null); }}
                      placeholder={"مثال:\n\"دخلت بريطانيا الحرب\"\n\"النفط مهم جداً\"\n\"تغيرت أوضاع الخليج\""}
                      rows={4}
                      style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid #cbd5e1",fontSize:13,fontFamily:"inherit",boxSizing:"border-box",resize:"vertical",direction:"rtl",lineHeight:1.7,marginBottom:12}}
                    />
                    {thesPhrase && (
                      <div style={{fontSize:10,color:"#94a3b8",marginBottom:8}}>{thesPhrase.split(/\s+/).filter(Boolean).length} كلمة</div>
                    )}
                    <button
                      onClick={runPhraseUpgrade}
                      disabled={thesPhraseLoading || !thesPhrase.trim()}
                      style={{width:"100%",padding:"10px",borderRadius:8,background:thesPhraseLoading||!thesPhrase.trim()?"#94a3b8":"#7C3AED",color:"white",border:"none",cursor:thesPhraseLoading||!thesPhrase.trim()?"not-allowed":"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,marginBottom:10}}>
                      {thesPhraseLoading ? "⏳ جارٍ الترقية..." : "✨ ترقية الأسلوب إلى مستوى الدكتوراه"}
                    </button>

                    {/* أمثلة جاهزة */}
                    <div style={{marginTop:6}}>
                      <div style={{fontSize:11,color:"#94a3b8",marginBottom:6}}>أمثلة جاهزة — اضغط للتطبيق:</div>
                      <div style={{display:"grid",gap:4}}>
                        {[
                          "دخلت بريطانيا الحرب",
                          "النفط مهم جداً للحلفاء",
                          "تغيرت أوضاع الخليج خلال الحرب",
                          "كانت البحرين مهمة",
                          "قاومت دول الخليج التدخل",
                        ].map((ex,i)=>(
                          <button key={i} onClick={()=>{ setThesPhrase(ex); setThesPhraseResult(null); }} style={{padding:"5px 10px",borderRadius:6,background:"#faf5ff",border:"0.5px solid #e9d5ff",color:"#7C3AED",cursor:"pointer",fontSize:11,fontFamily:"inherit",textAlign:"right"}}>{ex}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* سجل العبارات السابقة */}
                  {thesPhraseHistory.length > 0 && (
                    <div style={{background:"white",borderRadius:12,padding:14,border:"0.5px solid #e2e8f0"}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#475569",marginBottom:8}}>🕐 آخر العبارات المُرقَّاة</div>
                      <div style={{display:"grid",gap:4}}>
                        {thesPhraseHistory.map((h,i)=>(
                          <button key={i} onClick={()=>{ setThesPhrase(h.phrase); setThesPhraseResult(h.result); }} style={{padding:"4px 10px",borderRadius:5,background:"#faf5ff",border:"0.5px solid #e9d5ff",color:"#7C3AED",cursor:"pointer",fontSize:11,fontFamily:"inherit",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.phrase}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* العمود الأيسر: النتائج */}
                <div>
                  {/* حالة التحميل */}
                  {thesPhraseLoading && (
                    <div style={{background:"white",borderRadius:12,padding:40,border:"0.5px solid #e2e8f0",textAlign:"center"}}>
                      <div style={{fontSize:40,marginBottom:10}}>✍️</div>
                      <div style={{fontWeight:600,color:"#7C3AED",marginBottom:4}}>يُرقِّي الأسلوب...</div>
                      <div style={{fontSize:12,color:"#64748b"}}>يصوغ تراكيب تاريخية رصينة تليق بمستوى الدكتوراه</div>
                    </div>
                  )}

                  {/* نتائج الترقية */}
                  {thesPhraseResult && !thesPhraseLoading && (
                    <div>
                      {/* التشخيص */}
                      <div style={{background:"#fff7ed",borderRadius:12,padding:"12px 16px",border:"0.5px solid #fed7aa",marginBottom:14,display:"flex",gap:10,alignItems:"flex-start"}}>
                        <span style={{fontSize:18,flexShrink:0}}>🩺</span>
                        <div>
                          <div style={{fontWeight:600,fontSize:12,color:"#92400e",marginBottom:3}}>تشخيص الصياغة الأصلية: «{thesPhraseResult.original}»</div>
                          <div style={{fontSize:12,color:"#78350f",lineHeight:1.6}}>{thesPhraseResult.diagnosis}</div>
                        </div>
                      </div>

                      {/* الصياغات المُرقَّاة */}
                      <div style={{display:"grid",gap:10,marginBottom:14}}>
                        {(thesPhraseResult.upgrades||[]).map((upg, i) => {
                          const styleColor = REGISTER_COLOR[upg.style] || "#64748b";
                          return (
                            <div key={i} style={{background:"white",borderRadius:10,border:`1.5px solid ${styleColor}25`,overflow:"hidden"}}>
                              {/* رأس بطاقة الصياغة */}
                              <div style={{background:`${styleColor}10`,padding:"8px 14px",borderBottom:`0.5px solid ${styleColor}20`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                                  <span style={{fontSize:13,fontWeight:700,color:"#64748b"}}>#{i+1}</span>
                                  <span style={{fontSize:11,background:`${styleColor}20`,color:styleColor,borderRadius:5,padding:"2px 8px",fontWeight:600}}>{upg.style}</span>
                                </div>
                                <button
                                  onClick={()=>{navigator.clipboard.writeText(upg.text).then(()=>showNotif(`✅ تم نسخ الصياغة #${i+1}`));}}
                                  style={{padding:"3px 10px",borderRadius:5,background:"white",border:`0.5px solid ${styleColor}40`,color:styleColor,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
                                  📋 نسخ
                                </button>
                              </div>
                              {/* نص الصياغة */}
                              <div style={{padding:"12px 14px"}}>
                                <div style={{fontSize:14,fontWeight:600,lineHeight:1.8,color:"#1e293b",marginBottom:6,direction:"rtl"}}>{upg.text}</div>
                                {upg.note && (
                                  <div style={{fontSize:11,color:"#94a3b8",lineHeight:1.6,borderTop:"0.5px solid #f1f5f9",paddingTop:6}}>
                                    💡 {upg.note}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* النصيحة العامة */}
                      {thesPhraseResult.generalTip && (
                        <div style={{background:"#f0fdf4",borderRadius:10,padding:"12px 16px",border:"0.5px solid #86efac",display:"flex",gap:10,alignItems:"flex-start"}}>
                          <span style={{fontSize:18,flexShrink:0}}>🎓</span>
                          <div>
                            <div style={{fontWeight:600,fontSize:12,color:"#16a34a",marginBottom:3}}>نصيحة للباحث</div>
                            <div style={{fontSize:12,color:"#15803d",lineHeight:1.7}}>{thesPhraseResult.generalTip}</div>
                          </div>
                        </div>
                      )}

                      {/* نسخ كل الصياغات */}
                      <div style={{marginTop:12}}>
                        <button
                          onClick={()=>{
                            const text = (thesPhraseResult.upgrades||[]).map((u,i)=>`الصياغة ${i+1} (${u.style}):\n${u.text}`).join("\n\n");
                            navigator.clipboard.writeText(`ترقية: "${thesPhraseResult.original}"\n\n${text}`).then(()=>showNotif("✅ تم نسخ جميع الصياغات"));
                          }}
                          style={{padding:"7px 16px",borderRadius:8,background:"white",border:"0.5px solid #e2e8f0",cursor:"pointer",fontFamily:"inherit",fontSize:12,color:"#475569"}}>
                          📋 نسخ جميع الصياغات
                        </button>
                      </div>
                    </div>
                  )}

                  {/* رسالة ترحيبية */}
                  {!thesPhraseLoading && !thesPhraseResult && (
                    <div style={{background:"white",borderRadius:12,padding:40,border:"0.5px solid #e2e8f0",textAlign:"center"}}>
                      <div style={{fontSize:44,marginBottom:10}}>✍️</div>
                      <div style={{fontWeight:600,fontSize:14,marginBottom:6,color:"#7C3AED"}}>ترقية التراكيب القصيرة</div>
                      <div style={{fontSize:12,color:"#64748b",lineHeight:1.8}}>
                        أدخل جملة قصيرة بسيطة أو تركيباً عادياً<br/>
                        ستحصل على 5 صياغات أكاديمية رصينة<br/>
                        بأساليب متنوعة: وصفية، تحليلية، استنتاجية، علّية، بلاغية
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== SUPERVISOR ROOM ===== */}
        {page==="supervisor" && (
          <SupervisorRoom
            chapters={chapters}
            combinedDocs={combinedDocs}
            bibliography={bibliography}
            showNotif={showNotif}
            setConfirmDialog={setConfirmDialog}
            initialTab={supervisorTab}
            onOpened={()=>setSupervisorTab(null)}
          />
        )}

      </div>
    </div>
  );
}
