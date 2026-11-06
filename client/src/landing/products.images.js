// ==============================================
// src/landing/products.images.js
// ==============================================
//
// Product photos live here and nowhere else. Until a product has photos,
// the page shows a labelled sample image, so nothing breaks.
//
// ----------------------------------------------
// HOW TO ADD PHOTOS FOR A PRODUCT (2 steps)
// ----------------------------------------------
// 1. Drop the files in  src/landing/images/products/  and name them
//        <product-id>-1.webp, <product-id>-2.webp, <product-id>-3.webp
//    (the id is shown in the comment above each block below).
//    If a file is .jpg or .png, change the extension in its import line.
//
// 2. In that product's block, un-comment the import lines you have files
//    for, then un-comment its line in PRODUCT_IMAGES at the bottom and
//    list only the photos you actually imported.
//
// The FIRST image is the card photo; all of them show in the gallery.
// Any number of photos works (1 to 8 looks right). Add more by adding
// another import line and another entry in the array.
//
// Tip: white-background photos look best. Transparent PNGs work too.

// ==============================================
// IMPORTS  (un-comment as you add files)
// ==============================================

// MJ 2818D   (id: mj-2818d)
import mj2818d1 from "./images/products/mj-2818d-1.png";
import mj2818d2 from "./images/products/mj-2818d-2.png";
import mj2818d3 from "./images/products/mj-2818d-3.png";

// MJ 2818A   (id: mj-2818a)
import mj2818a1 from "./images/products/mj-2818a-1.png";
import mj2818a2 from "./images/products/mj-2818a-2.png";
import mj2818a3 from "./images/products/mj-2818a-3.png";

// MJ 2818 C   (id: mj-2818c)
import mj2818c1 from "./images/products/mj-2818c-1.png";
import mj2818c2 from "./images/products/mj-2818c-2.png";
import mj2818c3 from "./images/products/mj-2818c-3.png";

// SP-791   (id: sp-791)
import sp7911 from "./images/products/sp-791-1.png";
import sp7912 from "./images/products/sp-791-2.png";
import sp7913 from "./images/products/sp-791-3.png";

// MJ2806   (id: mj2806)
import mj28061 from "./images/products/mj2806-1.png";
import mj28062 from "./images/products/mj2806-2.png";
import mj28063 from "./images/products/mj2806-3.png";

// MJ2806AT   (id: mj2806at)
import mj2806at1 from "./images/products/mj2806at-1.png";
import mj2806at2 from "./images/products/mj2806at-2.png";
import mj2806at3 from "./images/products/mj2806at-3.png";

// MJ2880   (id: mj2880)
import mj28801 from "./images/products/mj2880-1.png";
import mj28802 from "./images/products/mj2880-2.png";
import mj28803 from "./images/products/mj2880-3.png";

// MJ2870   (id: mj2870)
import mj28701 from "./images/products/mj2870-1.png";
import mj28702 from "./images/products/mj2870-2.png";
import mj28703 from "./images/products/mj2870-3.png";

// MJ9520   (id: mj9520)
import mj95201 from "./images/products/mj9520-1.png";
import mj95202 from "./images/products/mj9520-2.png";
import mj95203 from "./images/products/mj9520-3.png";

// MJ9220   (id: mj9220)
import mj92201 from "./images/products/mj9220-1.png";
import mj92202 from "./images/products/mj9220-2.png";
import mj92203 from "./images/products/mj9220-3.png";
import mj92204 from "./images/products/mj9220-4.png";

// MJ9320   (id: mj9320)
import mj93201 from "./images/products/mj9320-1.png";
import mj93202 from "./images/products/mj9320-2.png";
import mj93203 from "./images/products/mj9320-3.png";

// MJ3850   (id: mj3850)
import mj38501 from "./images/products/mj3850-1.png";
import mj38502 from "./images/products/mj3850-2.png";
import mj38503 from "./images/products/mj3850-3.png";

// MJ2290   (id: mj2290)
import mj22901 from "./images/products/mj2290-1.png";
import mj22902 from "./images/products/mj2290-2.png";
import mj22903 from "./images/products/mj2290-3.png";

// MJ2850   (id: mj2850)
import mj28501 from "./images/products/mj2850-1.png";
import mj28502 from "./images/products/mj2850-2.png";
import mj28503 from "./images/products/mj2850-3.png";

// MJ3650   (id: mj3650)
import mj36501 from "./images/products/mj3650-1.png";
import mj36502 from "./images/products/mj3650-2.png";
import mj36503 from "./images/products/mj3650-3.png";

// MJ2816   (id: mj2816)
import mj28161 from "./images/products/mj2816-1.png";
import mj28162 from "./images/products/mj2816-2.png";
import mj28163 from "./images/products/mj2816-3.png";

// MJ2840   (id: mj2840)
import mj28401 from "./images/products/mj2840-1.png";
import mj28402 from "./images/products/mj2840-2.png";
import mj28403 from "./images/products/mj2840-3.png";

// MJ3670   (id: mj3670)
import mj36701 from "./images/products/mj3670-1.png";
import mj36702 from "./images/products/mj3670-2.png";
import mj36703 from "./images/products/mj3670-3.png";

// MJ6600   (id: mj6600)
import mj66001 from "./images/products/mj6600-1.png";
import mj66002 from "./images/products/mj6600-2.png";
import mj66003 from "./images/products/mj6600-3.png";

// MJ5200   (id: mj5200)
import mj52001 from "./images/products/mj5200-1.png";
import mj52002 from "./images/products/mj5200-2.png";
import mj52003 from "./images/products/mj5200-3.png";

// MJ3660   (id: mj3660)
import mj36601 from "./images/products/mj3660-1.png";
import mj36602 from "./images/products/mj3660-2.png";
import mj36603 from "./images/products/mj3660-3.png";

// SP-POS892UED   (id: sp-pos892ued)
// import spPos892ued1 from "./images/products/sp-pos892ued-1.png";
// import spPos892ued2 from "./images/products/sp-pos892ued-2.png";
// import spPos892ued3 from "./images/products/sp-pos892ued-3.png";

// SP-POS893USD   (id: sp-pos893usd)
// import spPos893usd1 from "./images/products/sp-pos893usd-1.png";
// import spPos893usd2 from "./images/products/sp-pos893usd-2.png";
// import spPos893usd3 from "./images/products/sp-pos893usd-3.png";

// SP-POS894UED   (id: sp-pos894ued)
// import spPos894ued1 from "./images/products/sp-pos894ued-1.png";
// import spPos894ued2 from "./images/products/sp-pos894ued-2.png";
// import spPos894ued3 from "./images/products/sp-pos894ued-3.png";

// SP POS892UBTMM   (id: sp-pos892ubtmm)
// import spPos892ubtmm1 from "./images/products/sp-pos892ubtmm-1.png";
// import spPos892ubtmm2 from "./images/products/sp-pos892ubtmm-2.png";
// import spPos892ubtmm3 from "./images/products/sp-pos892ubtmm-3.png";

// POS891UEBTDMWd Plus   (id: pos891uebtdmwd-plus)
// import pos891uebtdmwdPlus1 from "./images/products/pos891uebtdmwd-plus-1.png";
// import pos891uebtdmwdPlus2 from "./images/products/pos891uebtdmwd-plus-2.png";
// import pos891uebtdmwdPlus3 from "./images/products/pos891uebtdmwd-plus-3.png";

// HOP E-300   (id: hop-e-300)
// import hopE3001 from "./images/products/hop-e-300-1.png";
// import hopE3002 from "./images/products/hop-e-300-2.png";
// import hopE3003 from "./images/products/hop-e-300-3.png";

// HOP HL-58   (id: hop-hl-58)
// import hopHl581 from "./images/products/hop-hl-58-1.png";
// import hopHl582 from "./images/products/hop-hl-58-2.png";
// import hopHl583 from "./images/products/hop-hl-58-3.png";

// GS 405 A   (id: gs-405-a)
// import gs405A1 from "./images/products/gs-405-a-1.png";
// import gs405A2 from "./images/products/gs-405-a-2.png";
// import gs405A3 from "./images/products/gs-405-a-3.png";

// GS 405 B   (id: gs-405-b)
// import gs405B1 from "./images/products/gs-405-b-1.png";
// import gs405B2 from "./images/products/gs-405-b-2.png";
// import gs405B3 from "./images/products/gs-405-b-3.png";

// GS 406 A   (id: gs-406-a)
// import gs406A1 from "./images/products/gs-406-a-1.png";
// import gs406A2 from "./images/products/gs-406-a-2.png";
// import gs406A3 from "./images/products/gs-406-a-3.png";

// GS 410 G   (id: gs-410-g)
// import gs410G1 from "./images/products/gs-410-g-1.png";
// import gs410G2 from "./images/products/gs-410-g-2.png";
// import gs410G3 from "./images/products/gs-410-g-3.png";

// SP-335   (id: sp-335)
// import sp3351 from "./images/products/sp-335-1.png";
// import sp3352 from "./images/products/sp-335-2.png";
// import sp3353 from "./images/products/sp-335-3.png";

// RS609P   (id: rs609p)
// import rs609p1 from "./images/products/rs609p-1.png";
// import rs609p2 from "./images/products/rs609p-2.png";
// import rs609p3 from "./images/products/rs609p-3.png";

// MJ-T2   (id: mj-t2)
// import mjT21 from "./images/products/mj-t2-1.png";
// import mjT22 from "./images/products/mj-t2-2.png";
// import mjT23 from "./images/products/mj-t2-3.png";

// MJ-Q6   (id: mj-q6)
// import mjQ61 from "./images/products/mj-q6-1.png";
// import mjQ62 from "./images/products/mj-q6-2.png";
// import mjQ63 from "./images/products/mj-q6-3.png";

// MJ-A9   (id: mj-a9)
// import mjA91 from "./images/products/mj-a9-1.png";
// import mjA92 from "./images/products/mj-a9-2.png";
// import mjA93 from "./images/products/mj-a9-3.png";

// MJ-Q8   (id: mj-q8)
// import mjQ81 from "./images/products/mj-q8-1.png";
// import mjQ82 from "./images/products/mj-q8-2.png";
// import mjQ83 from "./images/products/mj-q8-3.png";

// MJ-G300   (id: mj-g300)
// import mjG3001 from "./images/products/mj-g300-1.png";
// import mjG3002 from "./images/products/mj-g300-2.png";
// import mjG3003 from "./images/products/mj-g300-3.png";

// MJ-T215   (id: mj-t215)
// import mjT2151 from "./images/products/mj-t215-1.png";
// import mjT2152 from "./images/products/mj-t215-2.png";
// import mjT2153 from "./images/products/mj-t215-3.png";

// ==============================================
// REGISTRY  (un-comment the product's line once its imports are on)
// ==============================================

export const PRODUCT_IMAGES = {
  "mj-2818d": [mj2818d1, mj2818d2, mj2818d3],
  "mj-2818a": [mj2818a1, mj2818a2, mj2818a3],
  "mj-2818c": [mj2818c1, mj2818c2, mj2818c3],
  "sp-791": [sp7911, sp7912, sp7913],
  "mj2806": [mj28061, mj28062, mj28063],
  "mj2806at": [mj2806at1, mj2806at2, mj2806at3],
  "mj2880": [mj28801, mj28802, mj28803],
  "mj2870": [mj28701, mj28702, mj28703],
  "mj9520": [mj95201, mj95202, mj95203],
  "mj9220": [mj92201, mj92202, mj92203, mj92204],
  "mj9320": [mj93201, mj93202, mj93203],
  "mj3850": [mj38501, mj38502, mj38503],
  "mj2290": [mj22901, mj22902, mj22903],
  "mj2850": [mj28501, mj28502, mj28503],
  "mj3650": [mj36501, mj36502, mj36503],
  "mj2816": [mj28161, mj28162, mj28163],
  "mj2840": [mj28401, mj28402, mj28403],
  "mj3670": [mj36701, mj36702, mj36703],
  "mj6600": [mj66001, mj66002, mj66003],
  "mj5200": [mj52001, mj52002, mj52003],
  "mj3660": [mj36601, mj36602, mj36603],
  // "sp-pos892ued": [spPos892ued1, spPos892ued2, spPos892ued3],
  // "sp-pos893usd": [spPos893usd1, spPos893usd2, spPos893usd3],
  // "sp-pos894ued": [spPos894ued1, spPos894ued2, spPos894ued3],
  // "sp-pos892ubtmm": [spPos892ubtmm1, spPos892ubtmm2, spPos892ubtmm3],
  // "pos891uebtdmwd-plus": [pos891uebtdmwdPlus1, pos891uebtdmwdPlus2, pos891uebtdmwdPlus3],
  // "hop-e-300": [hopE3001, hopE3002, hopE3003],
  // "hop-hl-58": [hopHl581, hopHl582, hopHl583],
  // "gs-405-a": [gs405A1, gs405A2, gs405A3],
  // "gs-405-b": [gs405B1, gs405B2, gs405B3],
  // "gs-406-a": [gs406A1, gs406A2, gs406A3],
  // "gs-410-g": [gs410G1, gs410G2, gs410G3],
  // "sp-335": [sp3351, sp3352, sp3353],
  // "rs609p": [rs609p1, rs609p2, rs609p3],
  // "mj-t2": [mjT21, mjT22, mjT23],
  // "mj-q6": [mjQ61, mjQ62, mjQ63],
  // "mj-a9": [mjA91, mjA92, mjA93],
  // "mj-q8": [mjQ81, mjQ82, mjQ83],
  // "mj-g300": [mjG3001, mjG3002, mjG3003],
  // "mj-t215": [mjT2151, mjT2152, mjT2153],
};
