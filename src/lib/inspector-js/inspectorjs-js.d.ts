export declare function createWebMDemuxer(): WebMDemuxer;

declare class EbmlElement {
    id: string;
    type: string;
    name: string;
    start: number;
    end: number;
    size: number;
    data: String | number | Date | Uint8Array;
    childs: EbmlElement[];
    constructor(id: string, type: string, name: string, start: number, end: number);
}

export declare class Frame {
    readonly frameType: FRAME_TYPE;
    readonly dts: number;
    private _cto;
    readonly duration: number;
    readonly data: Uint8Array;
    private _bytesOffset;
    readonly size: number;
    constructor(frameType: FRAME_TYPE, dts: number, _cto: number, duration: number, data: Uint8Array, _bytesOffset?: number);
    get bytesOffset(): number;
    get cto(): number;
    /**
     * aka "CTO"
     * @param cto
     */
    setPresentationTimeOffset(cto: number): void;
    setBytesOffset(bytesOffset: number): void;
}

declare enum FRAME_TYPE {
    I = "I",
    P = "P",
    B = "B",
    SI = "SI",
    SP = "SP",
    NONE = ""
}

export declare class FrameRate {
    fixed: boolean;
    fps: number;
    fpsDen: number;
    fpsNum: number;
    constructor(fixed: boolean, fps: number, fpsDen: number, fpsNum: number);
}

export declare interface IDemuxer {
    tracks: TracksHash;
    append(data: Uint8Array): void;
    end(): void;
}

declare interface ITrackInfo {
    TrackNumber: number;
    TrackUID: number;
    TrackType: number;
    DefaultDuration: number;
    TrackTimecodeScale: number;
    CodecID: string;
    CodecName: string;
    Video?: any;
    Audio?: any;
}

export declare class Size {
    width: number;
    height: number;
    constructor(width: number, height: number);
}

export declare abstract class Track {
    id: number;
    type: TrackType;
    mimeType: string;
    static MIME_TYPE_AAC: string;
    static MIME_TYPE_AVC: string;
    static MIME_TYPE_HEVC: string;
    static MIME_TYPE_MPEG: string;
    static MIME_TYPE_MPEG_L1: string;
    static MIME_TYPE_MPEG_l2: string;
    static MIME_TYPE_ID3: string;
    static MIME_TYPE_UNKNOWN: string;
    private _timeScale;
    constructor(id: number, type: TrackType, mimeType: string);
    abstract readonly frames: Frame[];
    isAv(): boolean;
    flush(): void;
    getFrames(): Frame[];
    hasTimescale(): boolean;
    getTimescale(): number;
    setTimescale(timeScale: number): void;
    /**
     * @deprecated
     */
    getMetadata(): {};
    abstract getResolution(): [number, number];
}

export declare type TracksHash = {
    [id: number]: Track;
};

declare enum TrackType {
    VIDEO = 0,
    AUDIO = 1,
    TEXT = 2,
    COMPLEX = 3,
    LOGO = 4,
    BUTTONS = 5,
    CONTROL = 6,
    METADATA = 7,
    UNKNOWN = 8
}

declare class Vint {
    value: number;
    length: number;
    constructor(value: number, length: number);
}

export declare class WebMDemuxer implements IDemuxer {
    tracks: {
        [id: number]: Track;
    };
    private data;
    private dataOffset;
    private elements;
    private ebmlInfo;
    private segmentInfo;
    constructor();
    append(data: Uint8Array): void;
    end(): void;
    private parseElements;
    private readElement;
    private parseElementData;
    private processElement;
    private processTracksElement;
    private processCluster;
    private processBlockGroup;
    private processBlockAdditions;
    private processBlockMore;
    private flatChilds;
    private getChild;
}

export declare class WebMTrack extends Track {
    private _frames;
    private _framesAlpha;
    private lastPts;
    private nsPerFrame;
    private lastTimecodeBase;
    private timecodeScale;
    private codec;
    private metadata;
    constructor(info: ITrackInfo, metadata: any);
    get frames(): Frame[];
    get framesAlpha(): Frame[];
    private static getType;
    private static getCodecNameFromID;
    getResolution(): [number, number];
    getFrames(): Frame[];
    getFramesAlpha(): Frame[];
    getCodec(): string;
    getMetadata(): any;
    setTimecode(time: number): void;
    processBlock(trackId: Vint, element: EbmlElement, isAlpha?: boolean): void;
}

export { }
