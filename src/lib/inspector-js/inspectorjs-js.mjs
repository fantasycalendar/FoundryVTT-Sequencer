class s {
  static parseStringWithLength(e, t, a) {
    let l = "";
    const n = e[t], i = Math.min(t + n + 1, a);
    for (let r = t + 1; r < i && e[r] !== 0; r++)
      l += String.fromCharCode(e[r]);
    return l;
  }
  static parseString(e, t, a) {
    return String.fromCharCode.apply(null, e.subarray(t, a));
  }
  static parseUTF8String(e, t, a) {
    const l = String.fromCharCode.apply(null, e.subarray(t, a));
    return decodeURIComponent(escape(l));
  }
  static parseNullTerminatedString(e, t, a) {
    let l = "";
    for (let n = t + 1; n < a && e[n] !== 0; n++)
      l += String.fromCharCode(e[n]);
    return l;
  }
  static parseFloat(e, t, a) {
    const l = new DataView(e.buffer, e.byteOffset, a);
    return a === 8 ? l.getFloat64(t) : l.getFloat32(t);
  }
  static parseInt(e, t, a) {
    let l = 0;
    for (let n = 0; n < a; n++)
      l |= e[t + n] << (a - n - 1) * 8;
    return l;
  }
  static parseUint(e, t, a, l = !0) {
    let n = 0, i = 0;
    for (let r = a - 1; r >= 0; r--)
      if (n |= e[t + r] << (a - r - 1) * 8 >>> 0, !l) {
        if (n < i)
          throw new Error(
            `Error parsing ${a} bytes-long unsigned integer from buffer: value overflow/wrap-around from previously ${i} to falsely ${n} at byte-index ${r}`
          );
        i = n;
      }
    return n;
  }
  static parseUint16(e, t) {
    return s.parseUint(e, t, 2);
  }
  static parseUint32(e, t) {
    return s.parseUint(e, t, 4);
  }
  static parseUint64(e, t) {
    return s.parseUint(e, t, 8, !1);
  }
  static parseIsoBoxType(e, t) {
    let a = "";
    return a += String.fromCharCode(e[t++]), a += String.fromCharCode(e[t++]), a += String.fromCharCode(e[t++]), a += String.fromCharCode(e[t]), a;
  }
  static parseIsoBoxDate(e) {
    return new Date(e * 1e3 - 20828448e5);
  }
  static parseBufferToHex(e, t, a) {
    let l = "";
    for (let n = t; n < a; n++)
      l += e[n].toString(16);
    return l;
  }
}
class b {
  constructor(e, t) {
    this.value = e, this.length = t;
  }
}
class y {
  constructor(e, t, a, l, n) {
    this.id = e, this.type = t, this.name = a, this.start = l, this.end = n, this.childs = [];
  }
}
class p {
  static readVint(e, t = 0) {
    let a = 1;
    for (; a <= 8 && !(e[t] >= Math.pow(2, 8 - a)); a++)
      ;
    if (a > 8 || t + a > e.length)
      return null;
    let l = e[t] & (1 << 8 - a) - 1;
    for (let n = 1; n < a; n++) {
      if (n === 7 && l >= Math.pow(2, 45) && e[t + 7] > 0)
        return new b(-1, a);
      l *= Math.pow(2, 8), l += e[t + n];
    }
    return new b(l, a);
  }
}
function g(m) {
  return w[m] || { name: "unknown", type: "unknown" };
}
const w = {
  80: {
    name: "ChapterDisplay",
    level: 4,
    type: "m",
    multiple: !0,
    minver: 1,
    webm: !0
  },
  83: {
    name: "TrackType",
    level: 3,
    type: "u",
    minver: 1,
    range: "1-254"
  },
  85: {
    name: "ChapString",
    level: 5,
    type: "8",
    minver: 1,
    webm: !0
  },
  86: {
    name: "CodecID",
    level: 3,
    type: "s",
    minver: 1
  },
  88: {
    name: "FlagDefault",
    level: 3,
    type: "u",
    minver: 1,
    default: "1",
    range: "0-1"
  },
  89: {
    name: "ChapterTrackNumber",
    level: 5,
    type: "u",
    multiple: !0,
    minver: 1,
    webm: !1,
    range: "not 0"
  },
  91: {
    name: "ChapterTimeStart",
    level: 4,
    type: "u",
    minver: 1,
    webm: !0
  },
  92: {
    name: "ChapterTimeEnd",
    level: 4,
    type: "u",
    minver: 1,
    webm: !1
  },
  96: {
    name: "CueRefTime",
    level: 5,
    type: "u",
    minver: 2,
    webm: !1
  },
  97: {
    name: "CueRefCluster",
    level: 5,
    type: "u",
    webm: !1
  },
  98: {
    name: "ChapterFlagHidden",
    level: 4,
    type: "u",
    minver: 1,
    webm: !1,
    default: "0",
    range: "0-1"
  },
  4254: {
    name: "ContentCompAlgo",
    level: 6,
    type: "u",
    minver: 1,
    webm: !1,
    default: "0",
    br: ["", "", "", ""],
    del: ["1 - bzlib,", "2 - lzo1x"]
  },
  4255: {
    name: "ContentCompSettings",
    level: 6,
    type: "b",
    minver: 1,
    webm: !1
  },
  4282: {
    name: "DocType",
    level: 1,
    type: "s",
    default: "matroska",
    minver: 1
  },
  4285: {
    name: "DocTypeReadVersion",
    level: 1,
    type: "u",
    default: "1",
    minver: 1
  },
  4286: {
    name: "EBMLVersion",
    level: 1,
    type: "u",
    default: "1",
    minver: 1
  },
  4287: {
    name: "DocTypeVersion",
    level: 1,
    type: "u",
    default: "1",
    minver: 1
  },
  4444: {
    name: "SegmentFamily",
    level: 2,
    type: "b",
    multiple: !0,
    minver: 1,
    webm: !1,
    bytesize: 16
  },
  4461: {
    name: "DateUTC",
    level: 2,
    type: "d",
    minver: 1
  },
  4484: {
    name: "TagDefault",
    level: 4,
    type: "u",
    minver: 1,
    webm: !1,
    default: "1",
    range: "0-1"
  },
  4485: {
    name: "TagBinary",
    level: 4,
    type: "b",
    minver: 1,
    webm: !1
  },
  4487: {
    name: "TagString",
    level: 4,
    type: "8",
    minver: 1,
    webm: !1
  },
  4489: {
    name: "Duration",
    level: 2,
    type: "f",
    minver: 1,
    range: "> 0"
  },
  4598: {
    name: "ChapterFlagEnabled",
    level: 4,
    type: "u",
    minver: 1,
    webm: !1,
    default: "1",
    range: "0-1"
  },
  4660: {
    name: "FileMimeType",
    level: 3,
    type: "s",
    minver: 1,
    webm: !1
  },
  4661: {
    name: "FileUsedStartTime",
    level: 3,
    type: "u",
    divx: !0
  },
  4662: {
    name: "FileUsedEndTime",
    level: 3,
    type: "u",
    divx: !0
  },
  4675: {
    name: "FileReferral",
    level: 3,
    type: "b",
    webm: !1
  },
  5031: {
    name: "ContentEncodingOrder",
    level: 5,
    type: "u",
    minver: 1,
    webm: !1,
    default: "0"
  },
  5032: {
    name: "ContentEncodingScope",
    level: 5,
    type: "u",
    minver: 1,
    webm: !1,
    default: "1",
    range: "not 0",
    br: ["", "", ""]
  },
  5033: {
    name: "ContentEncodingType",
    level: 5,
    type: "u",
    minver: 1,
    webm: !1,
    default: "0",
    br: ["", ""]
  },
  5034: {
    name: "ContentCompression",
    level: 5,
    type: "m",
    minver: 1,
    webm: !1
  },
  5035: {
    name: "ContentEncryption",
    level: 5,
    type: "m",
    minver: 1,
    webm: !1
  },
  5378: {
    name: "CueBlockNumber",
    level: 4,
    type: "u",
    minver: 1,
    default: "1",
    range: "not 0"
  },
  5654: {
    name: "ChapterStringUID",
    level: 4,
    type: "8",
    minver: 3,
    webm: !0
  },
  5741: {
    name: "WritingApp",
    level: 2,
    type: "8",
    minver: 1
  },
  5854: {
    name: "SilentTracks",
    level: 2,
    type: "m",
    minver: 1,
    webm: !1
  },
  6240: {
    name: "ContentEncoding",
    level: 4,
    type: "m",
    multiple: !0,
    minver: 1,
    webm: !1
  },
  6264: {
    name: "BitDepth",
    level: 4,
    type: "u",
    minver: 1,
    range: "not 0"
  },
  6532: {
    name: "SignedElement",
    level: 3,
    type: "b",
    multiple: !0,
    webm: !1
  },
  6624: {
    name: "TrackTranslate",
    level: 3,
    type: "m",
    multiple: !0,
    minver: 1,
    webm: !1
  },
  6911: {
    name: "ChapProcessCommand",
    level: 5,
    type: "m",
    multiple: !0,
    minver: 1,
    webm: !1
  },
  6922: {
    name: "ChapProcessTime",
    level: 6,
    type: "u",
    minver: 1,
    webm: !1
  },
  6924: {
    name: "ChapterTranslate",
    level: 2,
    type: "m",
    multiple: !0,
    minver: 1,
    webm: !1
  },
  6933: {
    name: "ChapProcessData",
    level: 6,
    type: "b",
    minver: 1,
    webm: !1
  },
  6944: {
    name: "ChapProcess",
    level: 4,
    type: "m",
    multiple: !0,
    minver: 1,
    webm: !1
  },
  6955: {
    name: "ChapProcessCodecID",
    level: 5,
    type: "u",
    minver: 1,
    webm: !1,
    default: "0"
  },
  7373: {
    name: "Tag",
    level: 2,
    type: "m",
    multiple: !0,
    minver: 1,
    webm: !1
  },
  7384: {
    name: "SegmentFilename",
    level: 2,
    type: "8",
    minver: 1,
    webm: !1
  },
  7446: {
    name: "AttachmentLink",
    level: 3,
    type: "u",
    minver: 1,
    webm: !1,
    range: "not 0"
  },
  258688: {
    name: "CodecName",
    level: 3,
    type: "8",
    minver: 1
  },
  18538067: {
    name: "Segment",
    level: 0,
    type: "m",
    multiple: !0,
    minver: 1
  },
  "447a": {
    name: "TagLanguage",
    level: 4,
    type: "s",
    minver: 1,
    webm: !1,
    default: "und"
  },
  "45a3": {
    name: "TagName",
    level: 4,
    type: "8",
    minver: 1,
    webm: !1
  },
  "67c8": {
    name: "SimpleTag",
    level: 3,
    recursive: !0,
    type: "m",
    multiple: !0,
    minver: 1,
    webm: !1
  },
  "63c6": {
    name: "TagAttachmentUID",
    level: 4,
    type: "u",
    multiple: !0,
    minver: 1,
    webm: !1,
    default: "0"
  },
  "63c4": {
    name: "TagChapterUID",
    level: 4,
    type: "u",
    multiple: !0,
    minver: 1,
    webm: !1,
    default: "0"
  },
  "63c9": {
    name: "TagEditionUID",
    level: 4,
    type: "u",
    multiple: !0,
    minver: 1,
    webm: !1,
    default: "0"
  },
  "63c5": {
    name: "TagTrackUID",
    level: 4,
    type: "u",
    multiple: !0,
    minver: 1,
    webm: !1,
    default: "0"
  },
  "63ca": {
    name: "TargetType",
    level: 4,
    type: "s",
    minver: 1,
    webm: !1,
    strong: "informational"
  },
  "68ca": {
    name: "TargetTypeValue",
    level: 4,
    type: "u",
    minver: 1,
    webm: !1,
    default: "50"
  },
  "63c0": {
    name: "Targets",
    level: 3,
    type: "m",
    minver: 1,
    webm: !1
  },
  "1254c367": {
    name: "Tags",
    level: 1,
    type: "m",
    multiple: !0,
    minver: 1,
    webm: !1
  },
  "450d": {
    name: "ChapProcessPrivate",
    level: 5,
    type: "b",
    minver: 1,
    webm: !1
  },
  "437e": {
    name: "ChapCountry",
    level: 5,
    type: "s",
    multiple: !0,
    minver: 1,
    webm: !1
  },
  "437c": {
    name: "ChapLanguage",
    level: 5,
    type: "s",
    multiple: !0,
    minver: 1,
    webm: !0,
    default: "eng"
  },
  "8f": {
    name: "ChapterTrack",
    level: 4,
    type: "m",
    minver: 1,
    webm: !1
  },
  "63c3": {
    name: "ChapterPhysicalEquiv",
    level: 4,
    type: "u",
    minver: 1,
    webm: !1
  },
  "6ebc": {
    name: "ChapterSegmentEditionUID",
    level: 4,
    type: "u",
    minver: 1,
    webm: !1,
    range: "not 0"
  },
  "6e67": {
    name: "ChapterSegmentUID",
    level: 4,
    type: "b",
    minver: 1,
    webm: !1,
    range: ">0",
    bytesize: 16
  },
  "73c4": {
    name: "ChapterUID",
    level: 4,
    type: "u",
    minver: 1,
    webm: !0,
    range: "not 0"
  },
  b6: {
    name: "ChapterAtom",
    level: 3,
    recursive: !0,
    type: "m",
    multiple: !0,
    minver: 1,
    webm: !0
  },
  "45dd": {
    name: "EditionFlagOrdered",
    level: 3,
    type: "u",
    minver: 1,
    webm: !1,
    default: "0",
    range: "0-1"
  },
  "45db": {
    name: "EditionFlagDefault",
    level: 3,
    type: "u",
    minver: 1,
    webm: !1,
    default: "0",
    range: "0-1"
  },
  "45bd": {
    name: "EditionFlagHidden",
    level: 3,
    type: "u",
    minver: 1,
    webm: !1,
    default: "0",
    range: "0-1"
  },
  "45bc": {
    name: "EditionUID",
    level: 3,
    type: "u",
    minver: 1,
    webm: !1,
    range: "not 0"
  },
  "45b9": {
    name: "EditionEntry",
    level: 2,
    type: "m",
    multiple: !0,
    minver: 1,
    webm: !0
  },
  "1043a770": {
    name: "Chapters",
    level: 1,
    type: "m",
    minver: 1,
    webm: !0
  },
  "46ae": {
    name: "FileUID",
    level: 3,
    type: "u",
    minver: 1,
    webm: !1,
    range: "not 0"
  },
  "465c": {
    name: "FileData",
    level: 3,
    type: "b",
    minver: 1,
    webm: !1
  },
  "466e": {
    name: "FileName",
    level: 3,
    type: "8",
    minver: 1,
    webm: !1
  },
  "467e": {
    name: "FileDescription",
    level: 3,
    type: "8",
    minver: 1,
    webm: !1
  },
  "61a7": {
    name: "AttachedFile",
    level: 2,
    type: "m",
    multiple: !0,
    minver: 1,
    webm: !1
  },
  "1941a469": {
    name: "Attachments",
    level: 1,
    type: "m",
    minver: 1,
    webm: !1
  },
  eb: {
    name: "CueRefCodecState",
    level: 5,
    type: "u",
    webm: !1,
    default: "0"
  },
  "535f": {
    name: "CueRefNumber",
    level: 5,
    type: "u",
    webm: !1,
    default: "1",
    range: "not 0"
  },
  db: {
    name: "CueReference",
    level: 4,
    type: "m",
    multiple: !0,
    minver: 2,
    webm: !1
  },
  ea: {
    name: "CueCodecState",
    level: 4,
    type: "u",
    minver: 2,
    webm: !1,
    default: "0"
  },
  b2: {
    name: "CueDuration",
    level: 4,
    type: "u",
    minver: 4,
    webm: !1
  },
  f0: {
    name: "CueRelativePosition",
    level: 4,
    type: "u",
    minver: 4,
    webm: !1
  },
  f1: {
    name: "CueClusterPosition",
    level: 4,
    type: "u",
    minver: 1
  },
  f7: {
    name: "CueTrack",
    level: 4,
    type: "u",
    minver: 1,
    range: "not 0"
  },
  b7: {
    name: "CueTrackPositions",
    level: 3,
    type: "m",
    multiple: !0,
    minver: 1
  },
  b3: {
    name: "CueTime",
    level: 3,
    type: "u",
    minver: 1
  },
  bb: {
    name: "CuePoint",
    level: 2,
    type: "m",
    multiple: !0,
    minver: 1
  },
  "1c53bb6b": {
    name: "Cues",
    level: 1,
    type: "m",
    minver: 1
  },
  "47e6": {
    name: "ContentSigHashAlgo",
    level: 6,
    type: "u",
    minver: 1,
    webm: !1,
    default: "0",
    br: ["", ""]
  },
  "47e5": {
    name: "ContentSigAlgo",
    level: 6,
    type: "u",
    minver: 1,
    webm: !1,
    default: "0",
    br: ""
  },
  "47e4": {
    name: "ContentSigKeyID",
    level: 6,
    type: "b",
    minver: 1,
    webm: !1
  },
  "47e3": {
    name: "ContentSignature",
    level: 6,
    type: "b",
    minver: 1,
    webm: !1
  },
  "47e2": {
    name: "ContentEncKeyID",
    level: 6,
    type: "b",
    minver: 1,
    webm: !1
  },
  "47e1": {
    name: "ContentEncAlgo",
    level: 6,
    type: "u",
    minver: 1,
    webm: !1,
    default: "0",
    br: ""
  },
  "6d80": {
    name: "ContentEncodings",
    level: 3,
    type: "m",
    minver: 1,
    webm: !1
  },
  c4: {
    name: "TrickMasterTrackSegmentUID",
    level: 3,
    type: "b",
    divx: !0,
    bytesize: 16
  },
  c7: {
    name: "TrickMasterTrackUID",
    level: 3,
    type: "u",
    divx: !0
  },
  c6: {
    name: "TrickTrackFlag",
    level: 3,
    type: "u",
    divx: !0,
    default: "0"
  },
  c1: {
    name: "TrickTrackSegmentUID",
    level: 3,
    type: "b",
    divx: !0,
    bytesize: 16
  },
  c0: {
    name: "TrickTrackUID",
    level: 3,
    type: "u",
    divx: !0
  },
  ed: {
    name: "TrackJoinUID",
    level: 5,
    type: "u",
    multiple: !0,
    minver: 3,
    webm: !1,
    range: "not 0"
  },
  e9: {
    name: "TrackJoinBlocks",
    level: 4,
    type: "m",
    minver: 3,
    webm: !1
  },
  e6: {
    name: "TrackPlaneType",
    level: 6,
    type: "u",
    minver: 3,
    webm: !1
  },
  e5: {
    name: "TrackPlaneUID",
    level: 6,
    type: "u",
    minver: 3,
    webm: !1,
    range: "not 0"
  },
  e4: {
    name: "TrackPlane",
    level: 5,
    type: "m",
    multiple: !0,
    minver: 3,
    webm: !1
  },
  e3: {
    name: "TrackCombinePlanes",
    level: 4,
    type: "m",
    minver: 3,
    webm: !1
  },
  e2: {
    name: "TrackOperation",
    level: 3,
    type: "m",
    minver: 3,
    webm: !1
  },
  "7d7b": {
    name: "ChannelPositions",
    level: 4,
    type: "b",
    webm: !1
  },
  "9f": {
    name: "Channels",
    level: 4,
    type: "u",
    minver: 1,
    default: "1",
    range: "not 0"
  },
  "78b5": {
    name: "OutputSamplingFrequency",
    level: 4,
    type: "f",
    minver: 1,
    default: "Sampling Frequency",
    range: "> 0"
  },
  b5: {
    name: "SamplingFrequency",
    level: 4,
    type: "f",
    minver: 1,
    default: "8000.0",
    range: "> 0"
  },
  e1: {
    name: "Audio",
    level: 3,
    type: "m",
    minver: 1
  },
  "2383e3": {
    name: "FrameRate",
    level: 4,
    type: "f",
    range: "> 0",
    strong: "Informational"
  },
  "2fb523": {
    name: "GammaValue",
    level: 4,
    type: "f",
    webm: !1,
    range: "> 0"
  },
  "2eb524": {
    name: "ColourSpace",
    level: 4,
    type: "b",
    minver: 1,
    webm: !1,
    bytesize: 4
  },
  "54b3": {
    name: "AspectRatioType",
    level: 4,
    type: "u",
    minver: 1,
    default: "0"
  },
  "54b2": {
    name: "DisplayUnit",
    level: 4,
    type: "u",
    minver: 1,
    default: "0"
  },
  "54ba": {
    name: "DisplayHeight",
    level: 4,
    type: "u",
    minver: 1,
    default: "PixelHeight",
    range: "not 0"
  },
  "54b0": {
    name: "DisplayWidth",
    level: 4,
    type: "u",
    minver: 1,
    default: "PixelWidth",
    range: "not 0"
  },
  "54dd": {
    name: "PixelCropRight",
    level: 4,
    type: "u",
    minver: 1,
    default: "0"
  },
  "54cc": {
    name: "PixelCropLeft",
    level: 4,
    type: "u",
    minver: 1,
    default: "0"
  },
  "54bb": {
    name: "PixelCropTop",
    level: 4,
    type: "u",
    minver: 1,
    default: "0"
  },
  "54aa": {
    name: "PixelCropBottom",
    level: 4,
    type: "u",
    minver: 1,
    default: "0"
  },
  ba: {
    name: "PixelHeight",
    level: 4,
    type: "u",
    minver: 1,
    range: "not 0"
  },
  b0: {
    name: "PixelWidth",
    level: 4,
    type: "u",
    minver: 1,
    range: "not 0"
  },
  "53b9": {
    name: "OldStereoMode",
    level: 4,
    type: "u",
    maxver: 0,
    webm: !1,
    divx: !1
  },
  "53c0": {
    name: "AlphaMode",
    level: 4,
    type: "u",
    minver: 3,
    webm: !0,
    default: "0"
  },
  "53b8": {
    name: "StereoMode",
    level: 4,
    type: "u",
    minver: 3,
    webm: !0,
    default: "0"
  },
  "9a": {
    name: "FlagInterlaced",
    level: 4,
    type: "u",
    minver: 2,
    webm: !0,
    default: "0",
    range: "0-1"
  },
  e0: {
    name: "Video",
    level: 3,
    type: "m",
    minver: 1
  },
  "66a5": {
    name: "TrackTranslateTrackID",
    level: 4,
    type: "b",
    minver: 1,
    webm: !1
  },
  "66bf": {
    name: "TrackTranslateCodec",
    level: 4,
    type: "u",
    minver: 1,
    webm: !1
  },
  "66fc": {
    name: "TrackTranslateEditionUID",
    level: 4,
    type: "u",
    multiple: !0,
    minver: 1,
    webm: !1
  },
  "56bb": {
    name: "SeekPreRoll",
    level: 3,
    type: "u",
    multiple: !1,
    default: "0",
    minver: 4,
    webm: !0
  },
  "56aa": {
    name: "CodecDelay",
    level: 3,
    type: "u",
    multiple: !1,
    default: "0",
    minver: 4,
    webm: !0
  },
  "6fab": {
    name: "TrackOverlay",
    level: 3,
    type: "u",
    multiple: !0,
    minver: 1,
    webm: !1
  },
  aa: {
    name: "CodecDecodeAll",
    level: 3,
    type: "u",
    minver: 2,
    webm: !1,
    default: "1",
    range: "0-1"
  },
  "26b240": {
    name: "CodecDownloadURL",
    level: 3,
    type: "s",
    multiple: !0,
    webm: !1
  },
  "3b4040": {
    name: "CodecInfoURL",
    level: 3,
    type: "s",
    multiple: !0,
    webm: !1
  },
  "3a9697": {
    name: "CodecSettings",
    level: 3,
    type: "8",
    webm: !1
  },
  "63a2": {
    name: "CodecPrivate",
    level: 3,
    type: "b",
    minver: 1
  },
  "22b59c": {
    name: "Language",
    level: 3,
    type: "s",
    minver: 1,
    default: "eng"
  },
  "536e": {
    name: "Name",
    level: 3,
    type: "8",
    minver: 1
  },
  "55ee": {
    name: "MaxBlockAdditionID",
    level: 3,
    type: "u",
    minver: 1,
    webm: !1,
    default: "0"
  },
  "537f": {
    name: "TrackOffset",
    level: 3,
    type: "i",
    webm: !1,
    default: "0"
  },
  "23314f": {
    name: "TrackTimecodeScale",
    level: 3,
    type: "f",
    minver: 1,
    maxver: 3,
    webm: !1,
    default: "1.0",
    range: "> 0"
  },
  "234e7a": {
    name: "DefaultDecodedFieldDuration",
    level: 3,
    type: "u",
    minver: 4,
    range: "not 0"
  },
  "23e383": {
    name: "DefaultDuration",
    level: 3,
    type: "u",
    minver: 1,
    range: "not 0"
  },
  "6df8": {
    name: "MaxCache",
    level: 3,
    type: "u",
    minver: 1,
    webm: !1
  },
  "6de7": {
    name: "MinCache",
    level: 3,
    type: "u",
    minver: 1,
    webm: !1,
    default: "0"
  },
  "9c": {
    name: "FlagLacing",
    level: 3,
    type: "u",
    minver: 1,
    default: "1",
    range: "0-1"
  },
  "55aa": {
    name: "FlagForced",
    level: 3,
    type: "u",
    minver: 1,
    default: "0",
    range: "0-1"
  },
  b9: {
    name: "FlagEnabled",
    level: 3,
    type: "u",
    minver: 2,
    webm: !0,
    default: "1",
    range: "0-1"
  },
  "73c5": {
    name: "TrackUID",
    level: 3,
    type: "u",
    minver: 1,
    range: "not 0"
  },
  d7: {
    name: "TrackNumber",
    level: 3,
    type: "u",
    minver: 1,
    range: "not 0"
  },
  ae: {
    name: "TrackEntry",
    level: 2,
    type: "m",
    multiple: !0,
    minver: 1
  },
  "1654ae6b": {
    name: "Tracks",
    level: 1,
    type: "m",
    multiple: !0,
    minver: 1
  },
  af: {
    name: "EncryptedBlock",
    level: 2,
    type: "b",
    multiple: !0,
    webm: !1
  },
  ca: {
    name: "ReferenceTimeCode",
    level: 4,
    type: "u",
    multiple: !1,
    minver: 0,
    webm: !1,
    divx: !0
  },
  c9: {
    name: "ReferenceOffset",
    level: 4,
    type: "u",
    multiple: !1,
    minver: 0,
    webm: !1,
    divx: !0
  },
  c8: {
    name: "ReferenceFrame",
    level: 3,
    type: "m",
    multiple: !1,
    minver: 0,
    webm: !1,
    divx: !0
  },
  cf: {
    name: "SliceDuration",
    level: 5,
    type: "u",
    default: "0"
  },
  ce: {
    name: "Delay",
    level: 5,
    type: "u",
    default: "0"
  },
  cb: {
    name: "BlockAdditionID",
    level: 5,
    type: "u",
    default: "0"
  },
  cd: {
    name: "FrameNumber",
    level: 5,
    type: "u",
    default: "0"
  },
  cc: {
    name: "LaceNumber",
    level: 5,
    type: "u",
    minver: 1,
    default: "0",
    divx: !1
  },
  e8: {
    name: "TimeSlice",
    level: 4,
    type: "m",
    multiple: !0,
    minver: 1,
    divx: !1
  },
  "8e": {
    name: "Slices",
    level: 3,
    type: "m",
    minver: 1,
    divx: !1
  },
  "75a2": {
    name: "DiscardPadding",
    level: 3,
    type: "i",
    minver: 4,
    webm: !0
  },
  a4: {
    name: "CodecState",
    level: 3,
    type: "b",
    minver: 2,
    webm: !1
  },
  fd: {
    name: "ReferenceVirtual",
    level: 3,
    type: "i",
    webm: !1
  },
  fb: {
    name: "ReferenceBlock",
    level: 3,
    type: "i",
    multiple: !0,
    minver: 1
  },
  fa: {
    name: "ReferencePriority",
    level: 3,
    type: "u",
    minver: 1,
    webm: !1,
    default: "0"
  },
  "9b": {
    name: "BlockDuration",
    level: 3,
    type: "u",
    minver: 1,
    default: "TrackDuration"
  },
  a5: {
    name: "BlockAdditional",
    level: 5,
    type: "b",
    minver: 1,
    webm: !1
  },
  ee: {
    name: "BlockAddID",
    level: 5,
    type: "u",
    minver: 1,
    webm: !1,
    default: "1",
    range: "not 0"
  },
  a6: {
    name: "BlockMore",
    level: 4,
    type: "m",
    multiple: !0,
    minver: 1,
    webm: !1
  },
  "75a1": {
    name: "BlockAdditions",
    level: 3,
    type: "m",
    minver: 1,
    webm: !1
  },
  a2: {
    name: "BlockVirtual",
    level: 3,
    type: "b",
    webm: !1
  },
  a1: {
    name: "Block",
    level: 3,
    type: "b",
    minver: 1
  },
  a0: {
    name: "BlockGroup",
    level: 2,
    type: "m",
    multiple: !0,
    minver: 1
  },
  a3: {
    name: "SimpleBlock",
    level: 2,
    type: "b",
    multiple: !0,
    minver: 2,
    webm: !0,
    divx: !0
  },
  ab: {
    name: "PrevSize",
    level: 2,
    type: "u",
    minver: 1
  },
  a7: {
    name: "Position",
    level: 2,
    type: "u",
    minver: 1,
    webm: !1
  },
  "58d7": {
    name: "SilentTrackNumber",
    level: 3,
    type: "u",
    multiple: !0,
    minver: 1,
    webm: !1
  },
  e7: {
    name: "Timecode",
    level: 2,
    type: "u",
    minver: 1
  },
  "1f43b675": {
    name: "Cluster",
    level: 1,
    type: "m",
    multiple: !0,
    minver: 1
  },
  "4d80": {
    name: "MuxingApp",
    level: 2,
    type: "8",
    minver: 1
  },
  "7ba9": {
    name: "Title",
    level: 2,
    type: "8",
    minver: 1,
    webm: !1
  },
  "2ad7b2": {
    name: "TimecodeScaleDenominator",
    level: 2,
    type: "u",
    minver: 4,
    default: "1000000000"
  },
  "2ad7b1": {
    name: "TimecodeScale",
    level: 2,
    type: "u",
    minver: 1,
    default: "1000000"
  },
  "69a5": {
    name: "ChapterTranslateID",
    level: 3,
    type: "b",
    minver: 1,
    webm: !1
  },
  "69bf": {
    name: "ChapterTranslateCodec",
    level: 3,
    type: "u",
    minver: 1,
    webm: !1
  },
  "69fc": {
    name: "ChapterTranslateEditionUID",
    level: 3,
    type: "u",
    multiple: !0,
    minver: 1,
    webm: !1
  },
  "3e83bb": {
    name: "NextFilename",
    level: 2,
    type: "8",
    minver: 1,
    webm: !1
  },
  "3eb923": {
    name: "NextUID",
    level: 2,
    type: "b",
    minver: 1,
    webm: !1,
    bytesize: 16
  },
  "3c83ab": {
    name: "PrevFilename",
    level: 2,
    type: "8",
    minver: 1,
    webm: !1
  },
  "3cb923": {
    name: "PrevUID",
    level: 2,
    type: "b",
    minver: 1,
    webm: !1,
    bytesize: 16
  },
  "73a4": {
    name: "SegmentUID",
    level: 2,
    type: "b",
    minver: 1,
    webm: !1,
    range: "not 0",
    bytesize: 16
  },
  "1549a966": {
    name: "Info",
    level: 1,
    type: "m",
    multiple: !0,
    minver: 1
  },
  "53ac": {
    name: "SeekPosition",
    level: 3,
    type: "u",
    minver: 1
  },
  "53ab": {
    name: "SeekID",
    level: 3,
    type: "b",
    minver: 1
  },
  "4dbb": {
    name: "Seek",
    level: 2,
    type: "m",
    multiple: !0,
    minver: 1
  },
  "114d9b74": {
    name: "SeekHead",
    level: 1,
    type: "m",
    multiple: !0,
    minver: 1
  },
  "7e7b": {
    name: "SignatureElementList",
    level: 2,
    type: "m",
    multiple: !0,
    webm: !1,
    i: "Cluster|Block|BlockAdditional"
  },
  "7e5b": {
    name: "SignatureElements",
    level: 1,
    type: "m",
    webm: !1
  },
  "7eb5": {
    name: "Signature",
    level: 1,
    type: "b",
    webm: !1
  },
  "7ea5": {
    name: "SignaturePublicKey",
    level: 1,
    type: "b",
    webm: !1
  },
  "7e9a": {
    name: "SignatureHash",
    level: 1,
    type: "u",
    webm: !1
  },
  "7e8a": {
    name: "SignatureAlgo",
    level: 1,
    type: "u",
    webm: !1
  },
  "1b538667": {
    name: "SignatureSlot",
    level: -1,
    type: "m",
    multiple: !0,
    webm: !1
  },
  bf: {
    name: "CRC-32",
    level: -1,
    type: "b",
    minver: 1,
    webm: !1
  },
  ec: {
    name: "Void",
    level: -1,
    type: "b",
    minver: 1
  },
  "42f3": {
    name: "EBMLMaxSizeLength",
    level: 1,
    type: "u",
    default: "8",
    minver: 1
  },
  "42f2": {
    name: "EBMLMaxIDLength",
    level: 1,
    type: "u",
    default: "4",
    minver: 1
  },
  "42f7": {
    name: "EBMLReadVersion",
    level: 1,
    type: "u",
    default: "1",
    minver: 1
  },
  "1a45dfa3": {
    name: "EBML",
    level: 0,
    type: "m",
    multiple: !0,
    minver: 1
  }
};
var f = /* @__PURE__ */ ((m) => (m.I = "I", m.P = "P", m.B = "B", m.SI = "SI", m.SP = "SP", m.NONE = "", m))(f || {}), u = /* @__PURE__ */ ((m) => (m[m.VIDEO = 0] = "VIDEO", m[m.AUDIO = 1] = "AUDIO", m[m.TEXT = 2] = "TEXT", m[m.COMPLEX = 3] = "COMPLEX", m[m.LOGO = 4] = "LOGO", m[m.BUTTONS = 5] = "BUTTONS", m[m.CONTROL = 6] = "CONTROL", m[m.METADATA = 7] = "METADATA", m[m.UNKNOWN = 8] = "UNKNOWN", m))(u || {});
const v = class v {
  constructor(e, t, a) {
    this.id = e, this.type = t, this.mimeType = a, this._timeScale = NaN;
  }
  isAv() {
    return this.type === 1 || this.type === 0;
  }
  flush() {
    this.frames.length = 0;
  }
  getFrames() {
    return this.frames;
  }
  hasTimescale() {
    return Number.isFinite(this.getTimescale());
  }
  getTimescale() {
    return this._timeScale;
  }
  setTimescale(e) {
    if (e <= 0 || !Number.isSafeInteger(e))
      throw new Error("Track timescale has to be strictly positive safe-integer value");
    this._timeScale = e;
  }
  /**
   * @deprecated
   */
  getMetadata() {
    return {};
  }
};
v.MIME_TYPE_AAC = "audio/mp4a-latm", v.MIME_TYPE_AVC = "video/avc", v.MIME_TYPE_HEVC = "video/hevc", v.MIME_TYPE_MPEG = "audio/mpeg", v.MIME_TYPE_MPEG_L1 = "audio/mpeg-L1", v.MIME_TYPE_MPEG_l2 = "audio/mpeg-L2", v.MIME_TYPE_ID3 = "application/id3", v.MIME_TYPE_UNKNOWN = "unknown";
let c = v;
class h {
  constructor(e, t, a, l, n, i = NaN) {
    if (this.frameType = e, this.dts = t, this._cto = a, this.duration = l, this.data = n, this._bytesOffset = i, this.size = n.length, t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Frame: DTS has to be positive safe-integer value but is ${t}`);
    if (this.size < 0 || !Number.isSafeInteger(this.size))
      throw new Error(`Frame: Size has to be positive safe-integer value but is ${this.size}`);
    if (l < 0 || !Number.isSafeInteger(l))
      throw new Error(`Frame: Duration has to be positive safe-integer value but is ${l}`);
    this.setPresentationTimeOffset(a);
  }
  get bytesOffset() {
    return this._bytesOffset;
  }
  get cto() {
    return this._cto;
  }
  /**
   * aka "CTO"
   * @param cto
   */
  setPresentationTimeOffset(e) {
    if (e < 0 || !Number.isSafeInteger(e))
      throw new Error(`Frame: CTO has to be positive safe-integer value but is ${e}`);
    this._cto = e;
  }
  setBytesOffset(e) {
    if (e < 0 || !Number.isSafeInteger(e))
      throw new Error(`Frame: Bytes-offset has to be positive safe-integer value but is ${e}`);
    this._bytesOffset = e;
  }
}
class o extends c {
  constructor(e, t) {
    const a = o.getType(e.TrackType), l = e.CodecName || o.getCodecNameFromID(e.CodecID);
    super(e.TrackNumber, a, a + "/" + l), this._frames = [], this._framesAlpha = [], this.lastPts = 0, this.lastTimecodeBase = 0, this.type = a, this.codec = l, this.metadata = t, this.nsPerFrame = e.DefaultDuration, this.timecodeScale = e.TrackTimecodeScale;
  }
  get frames() {
    return this._frames;
  }
  get framesAlpha() {
    return this._framesAlpha;
  }
  static getType(e) {
    switch (e) {
      case 1:
        return u.VIDEO;
      case 2:
        return u.AUDIO;
      case 3:
        return u.COMPLEX;
      case 16:
        return u.LOGO;
      case 17:
        return u.TEXT;
      case 18:
        return u.BUTTONS;
      case 32:
        return u.CONTROL;
      default:
        return u.UNKNOWN;
    }
  }
  static getCodecNameFromID(e) {
    if (!e)
      return null;
    const t = e.indexOf("_");
    return t < 0 ? e : e.substr(t + 1);
  }
  getResolution() {
    throw new Error("Method not implemented.");
  }
  getFrames() {
    return this._frames;
  }
  getFramesAlpha() {
    return this._framesAlpha;
  }
  getCodec() {
    return this.codec;
  }
  getMetadata() {
    if (!this.metadata)
      return null;
    if (this.type === u.VIDEO)
      return {
        frameRate: this.metadata.FrameRate,
        codecSize: {
          height: this.metadata.PixelHeight,
          width: this.metadata.PixelWidth
        },
        presentSize: {
          height: this.metadata.DisplayHeight,
          width: this.metadata.DisplayWidth
        }
      };
    if (this.type === u.AUDIO)
      return {
        sampleRate: this.metadata.SamplingFrequency
      };
  }
  setTimecode(e) {
    this.lastTimecodeBase = e;
  }
  processBlock(e, t, a = !1) {
    const l = t.data, n = s.parseUint16(l, e.length), i = s.parseUint(l, e.length + 2, 1);
    a || (this.lastPts = 1e3 * ((this.lastTimecodeBase + n) / (this.timecodeScale > 0 ? this.timecodeScale : 1)));
    const r = l.slice(a ? 0 : 4), d = a ? this._framesAlpha : this._frames;
    t.name === "SimpleBlock" && i & 128 ? d.push(new h(f.I, this.lastPts, 0, 0, r)) : d.push(new h(f.P, this.lastPts, 0, 0, r));
  }
}
class C {
  constructor() {
    this.tracks = {};
  }
  append(e) {
    if (this.elements = [], !this.data || this.data.byteLength === 0 || this.dataOffset >= this.data.byteLength)
      this.data = e, this.dataOffset = 0;
    else {
      const t = this.data.byteLength + e.byteLength, a = new Uint8Array(t);
      a.set(this.data, 0), a.set(e, this.data.byteLength), this.data = a;
    }
    this.elements = this.parseElements(this.data.byteLength), this.dataOffset > 0 && (this.data = this.data.subarray(this.dataOffset), this.dataOffset = 0);
  }
  end() {
  }
  parseElements(e) {
    const t = [];
    for (; this.dataOffset < e; ) {
      const a = this.readElement();
      if (a === null) {
        console.error("There was an issue demuxing a webm file: incorrect format");
        return;
      }
      a.type === "m" && (a.childs = this.parseElements(a.end)), t.push(a), this.processElement(a);
    }
    return t;
  }
  readElement() {
    const e = p.readVint(this.data, this.dataOffset);
    if (!e)
      return null;
    var t = s.parseBufferToHex(this.data, this.dataOffset, this.dataOffset + e.length);
    const a = g(t), l = new y(
      t,
      a.type,
      a.name,
      this.dataOffset,
      this.dataOffset + e.length
    );
    this.dataOffset += e.length;
    const n = p.readVint(this.data, this.dataOffset);
    if (this.dataOffset += n.length, n !== null && (l.size = n.value, n.value === -1 ? l.end = -1 : l.end += n.value + n.length, l.type !== "m")) {
      if (l.end !== -1) {
        const i = this.data.subarray(this.dataOffset, this.dataOffset + l.size);
        this.parseElementData(l, i);
      }
      this.dataOffset += l.size;
    }
    return l;
  }
  parseElementData(e, t) {
    switch (e.type) {
      case "u":
        e.data = s.parseUint(t, 0, t.byteLength);
        break;
      case "i":
        e.data = s.parseInt(t, 0, t.byteLength);
        break;
      case "s":
        e.data = s.parseString(t, 0, t.byteLength);
        break;
      case "8":
        e.data = s.parseUTF8String(t, 0, t.byteLength);
        break;
      case "b":
        e.data = t;
        break;
      case "f":
        e.data = s.parseFloat(t, 0, t.byteLength);
        break;
      case "d":
        const a = s.parseUint(t, 0, 8), l = new Date(2001, 0, 1, 0, 0, 0, 0);
        l.setSeconds(l.getSeconds() + a / (1e3 * 1e3)), e.data = l;
        break;
    }
  }
  processElement(e) {
    e.name === "EBML" ? (this.ebmlInfo = this.flatChilds(e), this.ebmlInfo.DocType !== "webm" && console.warn("WebM document doesnt have the right doc type (webm != " + this.ebmlInfo.DocType + ")")) : e.name === "Tracks" ? this.processTracksElement(e) : e.name === "Info" ? this.segmentInfo = this.flatChilds(e) : e.name === "Cluster" && this.processCluster(e);
  }
  processTracksElement(e) {
    for (const t of e.childs) {
      const a = this.flatChilds(t), l = a.hasOwnProperty("Video") ? this.getChild(t, "Video") : a.hasOwnProperty("Audio") ? this.getChild(t, "Audio") : null, n = l ? this.flatChilds(l) : null, i = new o(a, n);
      this.tracks[i.id] = i;
    }
  }
  processCluster(e) {
    for (const t of e.childs)
      if (t.name === "SimpleBlock" || t.name === "Block") {
        const a = p.readVint(t.data, 0);
        this.tracks[a.value] && this.tracks[a.value].processBlock(a, t);
      } else if (t.name === "BlockGroup")
        this.processBlockGroup(t);
      else if (t.name === "Timecode")
        for (const a in this.tracks)
          this.tracks.hasOwnProperty(a) && this.tracks[a].setTimecode(t.data);
  }
  processBlockGroup(e) {
    let t;
    for (const a of e.childs)
      a.name === "SimpleBlock" || a.name === "Block" ? (t = p.readVint(a.data, 0), this.tracks[t.value] && this.tracks[t.value].processBlock(t, a)) : a.name === "BlockAdditions" && this.processBlockAdditions(a, t);
  }
  processBlockAdditions(e, t) {
    for (const a of e.childs)
      a.name === "BlockMore" && this.processBlockMore(a, t);
  }
  processBlockMore(e, t) {
    const a = e.childs.find((n) => n.name === "BlockAddID"), l = e.childs.find((n) => n.name === "BlockAdditional");
    a.data === 1 && l && this.tracks[t.value].processBlock(t, l, !0);
  }
  flatChilds(e) {
    const t = {};
    for (const a of e.childs)
      t[a.name] = a.data;
    return t;
  }
  getChild(e, t) {
    if (!e.childs)
      return null;
    for (const a of e.childs)
      if (a.name === t)
        return a;
    return null;
  }
}
class T {
  constructor(e, t, a, l) {
    this.fixed = e, this.fps = t, this.fpsDen = a, this.fpsNum = l;
  }
}
class S {
  constructor(e, t) {
    this.width = e, this.height = t;
  }
}
function D() {
  return new C();
}
export {
  h as Frame,
  T as FrameRate,
  S as Size,
  c as Track,
  C as WebMDemuxer,
  D as createWebMDemuxer
};
//# sourceMappingURL=inspectorjs-js.mjs.map
