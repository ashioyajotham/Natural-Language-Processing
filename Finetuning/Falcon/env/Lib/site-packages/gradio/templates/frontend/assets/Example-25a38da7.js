import { r as resolve_wasm_src } from './file-url-1a9970c0.js';

const ERROR_RESPONSE_BODY_READER = new Error("failed to get response body reader");
const ERROR_INCOMPLETED_DOWNLOAD = new Error("failed to complete download");

const HeaderContentLength = "Content-Length";

/**
 * Download content of a URL with progress.
 *
 * Progress only works when Content-Length is provided by the server.
 *
 */
const downloadWithProgress = async (url, cb) => {
    const resp = await fetch(url);
    let buf;
    try {
        // Set total to -1 to indicate that there is not Content-Type Header.
        const total = parseInt(resp.headers.get(HeaderContentLength) || "-1");
        const reader = resp.body?.getReader();
        if (!reader)
            throw ERROR_RESPONSE_BODY_READER;
        const chunks = [];
        let received = 0;
        for (;;) {
            const { done, value } = await reader.read();
            const delta = value ? value.length : 0;
            if (done) {
                if (total != -1 && total !== received)
                    throw ERROR_INCOMPLETED_DOWNLOAD;
                cb && cb({ url, total, received, delta, done });
                break;
            }
            chunks.push(value);
            received += delta;
            cb && cb({ url, total, received, delta, done });
        }
        const data = new Uint8Array(received);
        let position = 0;
        for (const chunk of chunks) {
            data.set(chunk, position);
            position += chunk.length;
        }
        buf = data.buffer;
    }
    catch (e) {
        console.log(`failed to send download progress event: `, e);
        // Fetch arrayBuffer directly when it is not possible to get progress.
        buf = await resp.arrayBuffer();
        cb &&
            cb({
                url,
                total: buf.byteLength,
                received: buf.byteLength,
                delta: 0,
                done: true,
            });
    }
    return buf;
};
/**
 * toBlobURL fetches data from an URL and return a blob URL.
 *
 * Example:
 *
 * ```ts
 * await toBlobURL("http://localhost:3000/ffmpeg.js", "text/javascript");
 * ```
 */
const toBlobURL = async (url, mimeType, progress = false, cb) => {
    const buf = progress
        ? await downloadWithProgress(url, cb)
        : await (await fetch(url)).arrayBuffer();
    const blob = new Blob([buf], { type: mimeType });
    return URL.createObjectURL(blob);
};

var FFMessageType;
(function (FFMessageType) {
    FFMessageType["LOAD"] = "LOAD";
    FFMessageType["EXEC"] = "EXEC";
    FFMessageType["WRITE_FILE"] = "WRITE_FILE";
    FFMessageType["READ_FILE"] = "READ_FILE";
    FFMessageType["DELETE_FILE"] = "DELETE_FILE";
    FFMessageType["RENAME"] = "RENAME";
    FFMessageType["CREATE_DIR"] = "CREATE_DIR";
    FFMessageType["LIST_DIR"] = "LIST_DIR";
    FFMessageType["DELETE_DIR"] = "DELETE_DIR";
    FFMessageType["ERROR"] = "ERROR";
    FFMessageType["DOWNLOAD"] = "DOWNLOAD";
    FFMessageType["PROGRESS"] = "PROGRESS";
    FFMessageType["LOG"] = "LOG";
    FFMessageType["MOUNT"] = "MOUNT";
    FFMessageType["UNMOUNT"] = "UNMOUNT";
})(FFMessageType || (FFMessageType = {}));

/**
 * Generate an unique message ID.
 */
const getMessageID = (() => {
    let messageID = 0;
    return () => messageID++;
})();

const ERROR_NOT_LOADED = new Error("ffmpeg is not loaded, call `await ffmpeg.load()` first");
const ERROR_TERMINATED = new Error("called FFmpeg.terminate()");

/**
 * Provides APIs to interact with ffmpeg web worker.
 *
 * @example
 * ```ts
 * const ffmpeg = new FFmpeg();
 * ```
 */
class FFmpeg {
    #worker = null;
    /**
     * #resolves and #rejects tracks Promise resolves and rejects to
     * be called when we receive message from web worker.
     */
    #resolves = {};
    #rejects = {};
    #logEventCallbacks = [];
    #progressEventCallbacks = [];
    loaded = false;
    /**
     * register worker message event handlers.
     */
    #registerHandlers = () => {
        if (this.#worker) {
            this.#worker.onmessage = ({ data: { id, type, data }, }) => {
                switch (type) {
                    case FFMessageType.LOAD:
                        this.loaded = true;
                        this.#resolves[id](data);
                        break;
                    case FFMessageType.MOUNT:
                    case FFMessageType.UNMOUNT:
                    case FFMessageType.EXEC:
                    case FFMessageType.WRITE_FILE:
                    case FFMessageType.READ_FILE:
                    case FFMessageType.DELETE_FILE:
                    case FFMessageType.RENAME:
                    case FFMessageType.CREATE_DIR:
                    case FFMessageType.LIST_DIR:
                    case FFMessageType.DELETE_DIR:
                        this.#resolves[id](data);
                        break;
                    case FFMessageType.LOG:
                        this.#logEventCallbacks.forEach((f) => f(data));
                        break;
                    case FFMessageType.PROGRESS:
                        this.#progressEventCallbacks.forEach((f) => f(data));
                        break;
                    case FFMessageType.ERROR:
                        this.#rejects[id](data);
                        break;
                }
                delete this.#resolves[id];
                delete this.#rejects[id];
            };
        }
    };
    /**
     * Generic function to send messages to web worker.
     */
    #send = ({ type, data }, trans = [], signal) => {
        if (!this.#worker) {
            return Promise.reject(ERROR_NOT_LOADED);
        }
        return new Promise((resolve, reject) => {
            const id = getMessageID();
            this.#worker && this.#worker.postMessage({ id, type, data }, trans);
            this.#resolves[id] = resolve;
            this.#rejects[id] = reject;
            signal?.addEventListener("abort", () => {
                reject(new DOMException(`Message # ${id} was aborted`, "AbortError"));
            }, { once: true });
        });
    };
    on(event, callback) {
        if (event === "log") {
            this.#logEventCallbacks.push(callback);
        }
        else if (event === "progress") {
            this.#progressEventCallbacks.push(callback);
        }
    }
    off(event, callback) {
        if (event === "log") {
            this.#logEventCallbacks = this.#logEventCallbacks.filter((f) => f !== callback);
        }
        else if (event === "progress") {
            this.#progressEventCallbacks = this.#progressEventCallbacks.filter((f) => f !== callback);
        }
    }
    /**
     * Loads ffmpeg-core inside web worker. It is required to call this method first
     * as it initializes WebAssembly and other essential variables.
     *
     * @category FFmpeg
     * @returns `true` if ffmpeg core is loaded for the first time.
     */
    load = (config = {}, { signal } = {}) => {
        if (!this.#worker) {
            this.#worker = new Worker(new URL(""+new URL('worker-6d6dd1a7.js', import.meta.url).href+"", self.location), {
                type: "module",
            });
            this.#registerHandlers();
        }
        return this.#send({
            type: FFMessageType.LOAD,
            data: config,
        }, undefined, signal);
    };
    /**
     * Execute ffmpeg command.
     *
     * @remarks
     * To avoid common I/O issues, ["-nostdin", "-y"] are prepended to the args
     * by default.
     *
     * @example
     * ```ts
     * const ffmpeg = new FFmpeg();
     * await ffmpeg.load();
     * await ffmpeg.writeFile("video.avi", ...);
     * // ffmpeg -i video.avi video.mp4
     * await ffmpeg.exec(["-i", "video.avi", "video.mp4"]);
     * const data = ffmpeg.readFile("video.mp4");
     * ```
     *
     * @returns `0` if no error, `!= 0` if timeout (1) or error.
     * @category FFmpeg
     */
    exec = (
    /** ffmpeg command line args */
    args, 
    /**
     * milliseconds to wait before stopping the command execution.
     *
     * @defaultValue -1
     */
    timeout = -1, { signal } = {}) => this.#send({
        type: FFMessageType.EXEC,
        data: { args, timeout },
    }, undefined, signal);
    /**
     * Terminate all ongoing API calls and terminate web worker.
     * `FFmpeg.load()` must be called again before calling any other APIs.
     *
     * @category FFmpeg
     */
    terminate = () => {
        const ids = Object.keys(this.#rejects);
        // rejects all incomplete Promises.
        for (const id of ids) {
            this.#rejects[id](ERROR_TERMINATED);
            delete this.#rejects[id];
            delete this.#resolves[id];
        }
        if (this.#worker) {
            this.#worker.terminate();
            this.#worker = null;
            this.loaded = false;
        }
    };
    /**
     * Write data to ffmpeg.wasm.
     *
     * @example
     * ```ts
     * const ffmpeg = new FFmpeg();
     * await ffmpeg.load();
     * await ffmpeg.writeFile("video.avi", await fetchFile("../video.avi"));
     * await ffmpeg.writeFile("text.txt", "hello world");
     * ```
     *
     * @category File System
     */
    writeFile = (path, data, { signal } = {}) => {
        const trans = [];
        if (data instanceof Uint8Array) {
            trans.push(data.buffer);
        }
        return this.#send({
            type: FFMessageType.WRITE_FILE,
            data: { path, data },
        }, trans, signal);
    };
    mount = (fsType, options, mountPoint) => {
        const trans = [];
        return this.#send({
            type: FFMessageType.MOUNT,
            data: { fsType, options, mountPoint },
        }, trans);
    };
    unmount = (mountPoint) => {
        const trans = [];
        return this.#send({
            type: FFMessageType.UNMOUNT,
            data: { mountPoint },
        }, trans);
    };
    /**
     * Read data from ffmpeg.wasm.
     *
     * @example
     * ```ts
     * const ffmpeg = new FFmpeg();
     * await ffmpeg.load();
     * const data = await ffmpeg.readFile("video.mp4");
     * ```
     *
     * @category File System
     */
    readFile = (path, 
    /**
     * File content encoding, supports two encodings:
     * - utf8: read file as text file, return data in string type.
     * - binary: read file as binary file, return data in Uint8Array type.
     *
     * @defaultValue binary
     */
    encoding = "binary", { signal } = {}) => this.#send({
        type: FFMessageType.READ_FILE,
        data: { path, encoding },
    }, undefined, signal);
    /**
     * Delete a file.
     *
     * @category File System
     */
    deleteFile = (path, { signal } = {}) => this.#send({
        type: FFMessageType.DELETE_FILE,
        data: { path },
    }, undefined, signal);
    /**
     * Rename a file or directory.
     *
     * @category File System
     */
    rename = (oldPath, newPath, { signal } = {}) => this.#send({
        type: FFMessageType.RENAME,
        data: { oldPath, newPath },
    }, undefined, signal);
    /**
     * Create a directory.
     *
     * @category File System
     */
    createDir = (path, { signal } = {}) => this.#send({
        type: FFMessageType.CREATE_DIR,
        data: { path },
    }, undefined, signal);
    /**
     * List directory contents.
     *
     * @category File System
     */
    listDir = (path, { signal } = {}) => this.#send({
        type: FFMessageType.LIST_DIR,
        data: { path },
    }, undefined, signal);
    /**
     * Delete an empty directory.
     *
     * @category File System
     */
    deleteDir = (path, { signal } = {}) => this.#send({
        type: FFMessageType.DELETE_DIR,
        data: { path },
    }, undefined, signal);
}

const mimes = {
  "ez": "application/andrew-inset",
  "aw": "application/applixware",
  "atom": "application/atom+xml",
  "atomcat": "application/atomcat+xml",
  "atomdeleted": "application/atomdeleted+xml",
  "atomsvc": "application/atomsvc+xml",
  "dwd": "application/atsc-dwd+xml",
  "held": "application/atsc-held+xml",
  "rsat": "application/atsc-rsat+xml",
  "bdoc": "application/bdoc",
  "xcs": "application/calendar+xml",
  "ccxml": "application/ccxml+xml",
  "cdfx": "application/cdfx+xml",
  "cdmia": "application/cdmi-capability",
  "cdmic": "application/cdmi-container",
  "cdmid": "application/cdmi-domain",
  "cdmio": "application/cdmi-object",
  "cdmiq": "application/cdmi-queue",
  "cu": "application/cu-seeme",
  "mpd": "application/dash+xml",
  "davmount": "application/davmount+xml",
  "dbk": "application/docbook+xml",
  "dssc": "application/dssc+der",
  "xdssc": "application/dssc+xml",
  "es": "application/ecmascript",
  "ecma": "application/ecmascript",
  "emma": "application/emma+xml",
  "emotionml": "application/emotionml+xml",
  "epub": "application/epub+zip",
  "exi": "application/exi",
  "fdt": "application/fdt+xml",
  "pfr": "application/font-tdpfr",
  "geojson": "application/geo+json",
  "gml": "application/gml+xml",
  "gpx": "application/gpx+xml",
  "gxf": "application/gxf",
  "gz": "application/gzip",
  "hjson": "application/hjson",
  "stk": "application/hyperstudio",
  "ink": "application/inkml+xml",
  "inkml": "application/inkml+xml",
  "ipfix": "application/ipfix",
  "its": "application/its+xml",
  "jar": "application/java-archive",
  "war": "application/java-archive",
  "ear": "application/java-archive",
  "ser": "application/java-serialized-object",
  "class": "application/java-vm",
  "js": "application/javascript",
  "mjs": "application/javascript",
  "json": "application/json",
  "map": "application/json",
  "json5": "application/json5",
  "jsonml": "application/jsonml+json",
  "jsonld": "application/ld+json",
  "lgr": "application/lgr+xml",
  "lostxml": "application/lost+xml",
  "hqx": "application/mac-binhex40",
  "cpt": "application/mac-compactpro",
  "mads": "application/mads+xml",
  "webmanifest": "application/manifest+json",
  "mrc": "application/marc",
  "mrcx": "application/marcxml+xml",
  "ma": "application/mathematica",
  "nb": "application/mathematica",
  "mb": "application/mathematica",
  "mathml": "application/mathml+xml",
  "mbox": "application/mbox",
  "mscml": "application/mediaservercontrol+xml",
  "metalink": "application/metalink+xml",
  "meta4": "application/metalink4+xml",
  "mets": "application/mets+xml",
  "maei": "application/mmt-aei+xml",
  "musd": "application/mmt-usd+xml",
  "mods": "application/mods+xml",
  "m21": "application/mp21",
  "mp21": "application/mp21",
  "mp4s": "application/mp4",
  "m4p": "application/mp4",
  "doc": "application/msword",
  "dot": "application/msword",
  "mxf": "application/mxf",
  "nq": "application/n-quads",
  "nt": "application/n-triples",
  "cjs": "application/node",
  "bin": "application/octet-stream",
  "dms": "application/octet-stream",
  "lrf": "application/octet-stream",
  "mar": "application/octet-stream",
  "so": "application/octet-stream",
  "dist": "application/octet-stream",
  "distz": "application/octet-stream",
  "pkg": "application/octet-stream",
  "bpk": "application/octet-stream",
  "dump": "application/octet-stream",
  "elc": "application/octet-stream",
  "deploy": "application/octet-stream",
  "exe": "application/octet-stream",
  "dll": "application/octet-stream",
  "deb": "application/octet-stream",
  "dmg": "application/octet-stream",
  "iso": "application/octet-stream",
  "img": "application/octet-stream",
  "msi": "application/octet-stream",
  "msp": "application/octet-stream",
  "msm": "application/octet-stream",
  "buffer": "application/octet-stream",
  "oda": "application/oda",
  "opf": "application/oebps-package+xml",
  "ogx": "application/ogg",
  "omdoc": "application/omdoc+xml",
  "onetoc": "application/onenote",
  "onetoc2": "application/onenote",
  "onetmp": "application/onenote",
  "onepkg": "application/onenote",
  "oxps": "application/oxps",
  "relo": "application/p2p-overlay+xml",
  "xer": "application/patch-ops-error+xml",
  "pdf": "application/pdf",
  "pgp": "application/pgp-encrypted",
  "asc": "application/pgp-signature",
  "sig": "application/pgp-signature",
  "prf": "application/pics-rules",
  "p10": "application/pkcs10",
  "p7m": "application/pkcs7-mime",
  "p7c": "application/pkcs7-mime",
  "p7s": "application/pkcs7-signature",
  "p8": "application/pkcs8",
  "ac": "application/pkix-attr-cert",
  "cer": "application/pkix-cert",
  "crl": "application/pkix-crl",
  "pkipath": "application/pkix-pkipath",
  "pki": "application/pkixcmp",
  "pls": "application/pls+xml",
  "ai": "application/postscript",
  "eps": "application/postscript",
  "ps": "application/postscript",
  "provx": "application/provenance+xml",
  "cww": "application/prs.cww",
  "pskcxml": "application/pskc+xml",
  "raml": "application/raml+yaml",
  "rdf": "application/rdf+xml",
  "owl": "application/rdf+xml",
  "rif": "application/reginfo+xml",
  "rnc": "application/relax-ng-compact-syntax",
  "rl": "application/resource-lists+xml",
  "rld": "application/resource-lists-diff+xml",
  "rs": "application/rls-services+xml",
  "rapd": "application/route-apd+xml",
  "sls": "application/route-s-tsid+xml",
  "rusd": "application/route-usd+xml",
  "gbr": "application/rpki-ghostbusters",
  "mft": "application/rpki-manifest",
  "roa": "application/rpki-roa",
  "rsd": "application/rsd+xml",
  "rss": "application/rss+xml",
  "rtf": "application/rtf",
  "sbml": "application/sbml+xml",
  "scq": "application/scvp-cv-request",
  "scs": "application/scvp-cv-response",
  "spq": "application/scvp-vp-request",
  "spp": "application/scvp-vp-response",
  "sdp": "application/sdp",
  "senmlx": "application/senml+xml",
  "sensmlx": "application/sensml+xml",
  "setpay": "application/set-payment-initiation",
  "setreg": "application/set-registration-initiation",
  "shf": "application/shf+xml",
  "siv": "application/sieve",
  "sieve": "application/sieve",
  "smi": "application/smil+xml",
  "smil": "application/smil+xml",
  "rq": "application/sparql-query",
  "srx": "application/sparql-results+xml",
  "gram": "application/srgs",
  "grxml": "application/srgs+xml",
  "sru": "application/sru+xml",
  "ssdl": "application/ssdl+xml",
  "ssml": "application/ssml+xml",
  "swidtag": "application/swid+xml",
  "tei": "application/tei+xml",
  "teicorpus": "application/tei+xml",
  "tfi": "application/thraud+xml",
  "tsd": "application/timestamped-data",
  "toml": "application/toml",
  "trig": "application/trig",
  "ttml": "application/ttml+xml",
  "ubj": "application/ubjson",
  "rsheet": "application/urc-ressheet+xml",
  "td": "application/urc-targetdesc+xml",
  "vxml": "application/voicexml+xml",
  "wasm": "application/wasm",
  "wgt": "application/widget",
  "hlp": "application/winhlp",
  "wsdl": "application/wsdl+xml",
  "wspolicy": "application/wspolicy+xml",
  "xaml": "application/xaml+xml",
  "xav": "application/xcap-att+xml",
  "xca": "application/xcap-caps+xml",
  "xdf": "application/xcap-diff+xml",
  "xel": "application/xcap-el+xml",
  "xns": "application/xcap-ns+xml",
  "xenc": "application/xenc+xml",
  "xhtml": "application/xhtml+xml",
  "xht": "application/xhtml+xml",
  "xlf": "application/xliff+xml",
  "xml": "application/xml",
  "xsl": "application/xml",
  "xsd": "application/xml",
  "rng": "application/xml",
  "dtd": "application/xml-dtd",
  "xop": "application/xop+xml",
  "xpl": "application/xproc+xml",
  "xslt": "application/xml",
  "xspf": "application/xspf+xml",
  "mxml": "application/xv+xml",
  "xhvml": "application/xv+xml",
  "xvml": "application/xv+xml",
  "xvm": "application/xv+xml",
  "yang": "application/yang",
  "yin": "application/yin+xml",
  "zip": "application/zip",
  "3gpp": "video/3gpp",
  "adp": "audio/adpcm",
  "amr": "audio/amr",
  "au": "audio/basic",
  "snd": "audio/basic",
  "mid": "audio/midi",
  "midi": "audio/midi",
  "kar": "audio/midi",
  "rmi": "audio/midi",
  "mxmf": "audio/mobile-xmf",
  "mp3": "audio/mpeg",
  "m4a": "audio/mp4",
  "mp4a": "audio/mp4",
  "mpga": "audio/mpeg",
  "mp2": "audio/mpeg",
  "mp2a": "audio/mpeg",
  "m2a": "audio/mpeg",
  "m3a": "audio/mpeg",
  "oga": "audio/ogg",
  "ogg": "audio/ogg",
  "spx": "audio/ogg",
  "opus": "audio/ogg",
  "s3m": "audio/s3m",
  "sil": "audio/silk",
  "wav": "audio/wav",
  "weba": "audio/webm",
  "xm": "audio/xm",
  "ttc": "font/collection",
  "otf": "font/otf",
  "ttf": "font/ttf",
  "woff": "font/woff",
  "woff2": "font/woff2",
  "exr": "image/aces",
  "apng": "image/apng",
  "avif": "image/avif",
  "bmp": "image/bmp",
  "cgm": "image/cgm",
  "drle": "image/dicom-rle",
  "emf": "image/emf",
  "fits": "image/fits",
  "g3": "image/g3fax",
  "gif": "image/gif",
  "heic": "image/heic",
  "heics": "image/heic-sequence",
  "heif": "image/heif",
  "heifs": "image/heif-sequence",
  "hej2": "image/hej2k",
  "hsj2": "image/hsj2",
  "ief": "image/ief",
  "jls": "image/jls",
  "jp2": "image/jp2",
  "jpg2": "image/jp2",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "jpe": "image/jpeg",
  "jph": "image/jph",
  "jhc": "image/jphc",
  "jpm": "image/jpm",
  "jpx": "image/jpx",
  "jpf": "image/jpx",
  "jxr": "image/jxr",
  "jxra": "image/jxra",
  "jxrs": "image/jxrs",
  "jxs": "image/jxs",
  "jxsc": "image/jxsc",
  "jxsi": "image/jxsi",
  "jxss": "image/jxss",
  "ktx": "image/ktx",
  "ktx2": "image/ktx2",
  "png": "image/png",
  "btif": "image/prs.btif",
  "pti": "image/prs.pti",
  "sgi": "image/sgi",
  "svg": "image/svg+xml",
  "svgz": "image/svg+xml",
  "t38": "image/t38",
  "tif": "image/tiff",
  "tiff": "image/tiff",
  "tfx": "image/tiff-fx",
  "webp": "image/webp",
  "wmf": "image/wmf",
  "disposition-notification": "message/disposition-notification",
  "u8msg": "message/global",
  "u8dsn": "message/global-delivery-status",
  "u8mdn": "message/global-disposition-notification",
  "u8hdr": "message/global-headers",
  "eml": "message/rfc822",
  "mime": "message/rfc822",
  "3mf": "model/3mf",
  "gltf": "model/gltf+json",
  "glb": "model/gltf-binary",
  "igs": "model/iges",
  "iges": "model/iges",
  "msh": "model/mesh",
  "mesh": "model/mesh",
  "silo": "model/mesh",
  "mtl": "model/mtl",
  "obj": "model/obj",
  "stpz": "model/step+zip",
  "stpxz": "model/step-xml+zip",
  "stl": "model/stl",
  "wrl": "model/vrml",
  "vrml": "model/vrml",
  "x3db": "model/x3d+fastinfoset",
  "x3dbz": "model/x3d+binary",
  "x3dv": "model/x3d-vrml",
  "x3dvz": "model/x3d+vrml",
  "x3d": "model/x3d+xml",
  "x3dz": "model/x3d+xml",
  "appcache": "text/cache-manifest",
  "manifest": "text/cache-manifest",
  "ics": "text/calendar",
  "ifb": "text/calendar",
  "coffee": "text/coffeescript",
  "litcoffee": "text/coffeescript",
  "css": "text/css",
  "csv": "text/csv",
  "html": "text/html",
  "htm": "text/html",
  "shtml": "text/html",
  "jade": "text/jade",
  "jsx": "text/jsx",
  "less": "text/less",
  "markdown": "text/markdown",
  "md": "text/markdown",
  "mml": "text/mathml",
  "mdx": "text/mdx",
  "n3": "text/n3",
  "txt": "text/plain",
  "text": "text/plain",
  "conf": "text/plain",
  "def": "text/plain",
  "list": "text/plain",
  "log": "text/plain",
  "in": "text/plain",
  "ini": "text/plain",
  "dsc": "text/prs.lines.tag",
  "rtx": "text/richtext",
  "sgml": "text/sgml",
  "sgm": "text/sgml",
  "shex": "text/shex",
  "slim": "text/slim",
  "slm": "text/slim",
  "spdx": "text/spdx",
  "stylus": "text/stylus",
  "styl": "text/stylus",
  "tsv": "text/tab-separated-values",
  "t": "text/troff",
  "tr": "text/troff",
  "roff": "text/troff",
  "man": "text/troff",
  "me": "text/troff",
  "ms": "text/troff",
  "ttl": "text/turtle",
  "uri": "text/uri-list",
  "uris": "text/uri-list",
  "urls": "text/uri-list",
  "vcard": "text/vcard",
  "vtt": "text/vtt",
  "yaml": "text/yaml",
  "yml": "text/yaml",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  "h261": "video/h261",
  "h263": "video/h263",
  "h264": "video/h264",
  "m4s": "video/iso.segment",
  "jpgv": "video/jpeg",
  "jpgm": "image/jpm",
  "mj2": "video/mj2",
  "mjp2": "video/mj2",
  "ts": "video/mp2t",
  "mp4": "video/mp4",
  "mp4v": "video/mp4",
  "mpg4": "video/mp4",
  "mpeg": "video/mpeg",
  "mpg": "video/mpeg",
  "mpe": "video/mpeg",
  "m1v": "video/mpeg",
  "m2v": "video/mpeg",
  "ogv": "video/ogg",
  "qt": "video/quicktime",
  "mov": "video/quicktime",
  "webm": "video/webm"
};

function lookup(extn) {
	let tmp = ('' + extn).trim().toLowerCase();
	let idx = tmp.lastIndexOf('.');
	return mimes[!~idx ? tmp : tmp.substring(++idx)];
}

const prettyBytes = (bytes) => {
  let units = ["B", "KB", "MB", "GB", "PB"];
  let i = 0;
  while (bytes > 1024) {
    bytes /= 1024;
    i++;
  }
  let unit = units[i];
  return bytes.toFixed(1) + " " + unit;
};
const playable = () => {
  return true;
};
function loaded(node, { autoplay }) {
  async function handle_playback() {
    if (!autoplay)
      return;
    await node.play();
  }
  node.addEventListener("loadeddata", handle_playback);
  return {
    destroy() {
      node.removeEventListener("loadeddata", handle_playback);
    }
  };
}
async function loadFfmpeg() {
  const ffmpeg = new FFmpeg();
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.4/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm")
  });
  return ffmpeg;
}
async function trimVideo(ffmpeg, startTime, endTime, videoElement) {
  try {
    const videoUrl = videoElement.src;
    const mimeType = lookup(videoElement.src) || "video/mp4";
    const blobUrl = await toBlobURL(videoUrl, mimeType);
    const response = await fetch(blobUrl);
    const vidBlob = await response.blob();
    const type = getVideoExtensionFromMimeType(mimeType) || "mp4";
    const inputName = `input.${type}`;
    const outputName = `output.${type}`;
    await ffmpeg.writeFile(
      inputName,
      new Uint8Array(await vidBlob.arrayBuffer())
    );
    let command = [
      "-i",
      inputName,
      "-ss",
      startTime.toString(),
      "-to",
      endTime.toString(),
      "-c:a",
      "copy",
      outputName
    ];
    await ffmpeg.exec(command);
    const outputData = await ffmpeg.readFile(outputName);
    const outputBlob = new Blob([outputData], {
      type: `video/${type}`
    });
    return outputBlob;
  } catch (error) {
    console.error("Error initializing FFmpeg:", error);
  }
}
const getVideoExtensionFromMimeType = (mimeType) => {
  const videoMimeToExtensionMap = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/ogg": "ogv",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/x-matroska": "mkv",
    "video/mpeg": "mpeg",
    "video/3gpp": "3gp",
    "video/3gpp2": "3g2",
    "video/h261": "h261",
    "video/h263": "h263",
    "video/h264": "h264",
    "video/jpeg": "jpgv",
    "video/jpm": "jpm",
    "video/mj2": "mj2",
    "video/mpv": "mpv",
    "video/vnd.ms-playready.media.pyv": "pyv",
    "video/vnd.uvvu.mp4": "uvu",
    "video/vnd.vivo": "viv",
    "video/x-f4v": "f4v",
    "video/x-fli": "fli",
    "video/x-flv": "flv",
    "video/x-m4v": "m4v",
    "video/x-ms-asf": "asf",
    "video/x-ms-wm": "wm",
    "video/x-ms-wmv": "wmv",
    "video/x-ms-wmx": "wmx",
    "video/x-ms-wvx": "wvx",
    "video/x-sgi-movie": "movie",
    "video/x-smv": "smv"
  };
  return videoMimeToExtensionMap[mimeType] || null;
};

const Video_svelte_svelte_type_style_lang = '';

/* home/runner/work/gradio/gradio/js/video/shared/Video.svelte generated by Svelte v4.2.2 */
const {
	SvelteComponent: SvelteComponent$1,
	action_destroyer,
	add_render_callback,
	append: append$1,
	assign,
	attr: attr$1,
	binding_callbacks: binding_callbacks$1,
	create_slot,
	detach: detach$1,
	element: element$1,
	empty: empty$1,
	exclude_internal_props,
	get_all_dirty_from_scope,
	get_slot_changes,
	handle_promise,
	init,
	insert: insert$1,
	is_function: is_function$1,
	listen,
	noop: noop$1,
	raf,
	run_all,
	safe_not_equal: safe_not_equal$1,
	set_data: set_data$1,
	set_style,
	space,
	src_url_equal,
	text: text$1,
	toggle_class: toggle_class$1,
	transition_in: transition_in$1,
	transition_out: transition_out$1,
	update_await_block_branch,
	update_slot_base
} = window.__gradio__svelte__internal;
const { createEventDispatcher } = window.__gradio__svelte__internal;
function create_catch_block(ctx) {
	let p;
	let t_value = /*error*/ ctx[20].message + "";
	let t;

	return {
		c() {
			p = element$1("p");
			t = text$1(t_value);
			set_style(p, "color", "red");
		},
		m(target, anchor) {
			insert$1(target, p, anchor);
			append$1(p, t);
		},
		p(ctx, dirty) {
			if (dirty & /*src*/ 16 && t_value !== (t_value = /*error*/ ctx[20].message + "")) set_data$1(t, t_value);
		},
		i: noop$1,
		o: noop$1,
		d(detaching) {
			if (detaching) {
				detach$1(p);
			}
		}
	};
}

// (18:48)   <!--  The spread operator with `$$props` or `$$restProps` can't be used here  to pass props from the parent component to the <video> element  because of its unexpected behavior: https://github.com/sveltejs/svelte/issues/7404  For example, if we add {...$$props}
function create_then_block(ctx) {
	let div;
	let t;
	let video;
	let video_src_value;
	let video_data_testid_value;
	let video_updating = false;
	let video_animationframe;
	let video_is_paused = true;
	let loaded_action;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[14].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[13], null);

	function video_timeupdate_handler() {
		cancelAnimationFrame(video_animationframe);

		if (!video.paused) {
			video_animationframe = raf(video_timeupdate_handler);
			video_updating = true;
		}

		/*video_timeupdate_handler*/ ctx[15].call(video);
	}

	return {
		c() {
			div = element$1("div");
			div.innerHTML = `<span class="load-wrap svelte-1dr94qp"><span class="loader svelte-1dr94qp"></span></span>`;
			t = space();
			video = element$1("video");
			if (default_slot) default_slot.c();
			attr$1(div, "class", "overlay svelte-1dr94qp");
			toggle_class$1(div, "hidden", !/*processingVideo*/ ctx[10]);
			if (!src_url_equal(video.src, video_src_value = /*resolved_src*/ ctx[19])) attr$1(video, "src", video_src_value);
			video.muted = /*muted*/ ctx[5];
			video.playsInline = /*playsinline*/ ctx[6];
			attr$1(video, "preload", /*preload*/ ctx[7]);
			video.autoplay = /*autoplay*/ ctx[8];
			video.controls = /*controls*/ ctx[9];
			attr$1(video, "data-testid", video_data_testid_value = /*$$props*/ ctx[12]["data-testid"]);
			attr$1(video, "crossorigin", "anonymous");
			attr$1(video, "class", "svelte-1dr94qp");
			if (/*duration*/ ctx[1] === void 0) add_render_callback(() => /*video_durationchange_handler*/ ctx[16].call(video));
		},
		m(target, anchor) {
			insert$1(target, div, anchor);
			insert$1(target, t, anchor);
			insert$1(target, video, anchor);

			if (default_slot) {
				default_slot.m(video, null);
			}

			/*video_binding*/ ctx[18](video);
			current = true;

			if (!mounted) {
				dispose = [
					listen(video, "loadeddata", /*dispatch*/ ctx[11].bind(null, "loadeddata")),
					listen(video, "click", /*dispatch*/ ctx[11].bind(null, "click")),
					listen(video, "play", /*dispatch*/ ctx[11].bind(null, "play")),
					listen(video, "pause", /*dispatch*/ ctx[11].bind(null, "pause")),
					listen(video, "ended", /*dispatch*/ ctx[11].bind(null, "ended")),
					listen(video, "mouseover", /*dispatch*/ ctx[11].bind(null, "mouseover")),
					listen(video, "mouseout", /*dispatch*/ ctx[11].bind(null, "mouseout")),
					listen(video, "focus", /*dispatch*/ ctx[11].bind(null, "focus")),
					listen(video, "blur", /*dispatch*/ ctx[11].bind(null, "blur")),
					listen(video, "timeupdate", video_timeupdate_handler),
					listen(video, "durationchange", /*video_durationchange_handler*/ ctx[16]),
					listen(video, "play", /*video_play_pause_handler*/ ctx[17]),
					listen(video, "pause", /*video_play_pause_handler*/ ctx[17]),
					action_destroyer(loaded_action = loaded.call(null, video, { autoplay: /*autoplay*/ ctx[8] ?? false }))
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (!current || dirty & /*processingVideo*/ 1024) {
				toggle_class$1(div, "hidden", !/*processingVideo*/ ctx[10]);
			}

			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 8192)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[13],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[13])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[13], dirty, null),
						null
					);
				}
			}

			if (!current || dirty & /*src*/ 16 && !src_url_equal(video.src, video_src_value = /*resolved_src*/ ctx[19])) {
				attr$1(video, "src", video_src_value);
			}

			if (!current || dirty & /*muted*/ 32) {
				video.muted = /*muted*/ ctx[5];
			}

			if (!current || dirty & /*playsinline*/ 64) {
				video.playsInline = /*playsinline*/ ctx[6];
			}

			if (!current || dirty & /*preload*/ 128) {
				attr$1(video, "preload", /*preload*/ ctx[7]);
			}

			if (!current || dirty & /*autoplay*/ 256) {
				video.autoplay = /*autoplay*/ ctx[8];
			}

			if (!current || dirty & /*controls*/ 512) {
				video.controls = /*controls*/ ctx[9];
			}

			if (!current || dirty & /*$$props*/ 4096 && video_data_testid_value !== (video_data_testid_value = /*$$props*/ ctx[12]["data-testid"])) {
				attr$1(video, "data-testid", video_data_testid_value);
			}

			if (!video_updating && dirty & /*currentTime*/ 1 && !isNaN(/*currentTime*/ ctx[0])) {
				video.currentTime = /*currentTime*/ ctx[0];
			}

			video_updating = false;

			if (dirty & /*paused*/ 4 && video_is_paused !== (video_is_paused = /*paused*/ ctx[2])) {
				video[video_is_paused ? "pause" : "play"]();
			}

			if (loaded_action && is_function$1(loaded_action.update) && dirty & /*autoplay*/ 256) loaded_action.update.call(null, { autoplay: /*autoplay*/ ctx[8] ?? false });
		},
		i(local) {
			if (current) return;
			transition_in$1(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out$1(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach$1(div);
				detach$1(t);
				detach$1(video);
			}

			if (default_slot) default_slot.d(detaching);
			/*video_binding*/ ctx[18](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (1:0) <script lang="ts">import { createEventDispatcher }
function create_pending_block(ctx) {
	return {
		c: noop$1,
		m: noop$1,
		p: noop$1,
		i: noop$1,
		o: noop$1,
		d: noop$1
	};
}

function create_fragment$1(ctx) {
	let await_block_anchor;
	let promise;
	let current;

	let info = {
		ctx,
		current: null,
		token: null,
		hasCatch: true,
		pending: create_pending_block,
		then: create_then_block,
		catch: create_catch_block,
		value: 19,
		error: 20,
		blocks: [,,,]
	};

	handle_promise(promise = resolve_wasm_src(/*src*/ ctx[4]), info);

	return {
		c() {
			await_block_anchor = empty$1();
			info.block.c();
		},
		m(target, anchor) {
			insert$1(target, await_block_anchor, anchor);
			info.block.m(target, info.anchor = anchor);
			info.mount = () => await_block_anchor.parentNode;
			info.anchor = await_block_anchor;
			current = true;
		},
		p(new_ctx, [dirty]) {
			ctx = new_ctx;
			info.ctx = ctx;

			if (dirty & /*src*/ 16 && promise !== (promise = resolve_wasm_src(/*src*/ ctx[4])) && handle_promise(promise, info)) ; else {
				update_await_block_branch(info, ctx, dirty);
			}
		},
		i(local) {
			if (current) return;
			transition_in$1(info.block);
			current = true;
		},
		o(local) {
			for (let i = 0; i < 3; i += 1) {
				const block = info.blocks[i];
				transition_out$1(block);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach$1(await_block_anchor);
			}

			info.block.d(detaching);
			info.token = null;
			info = null;
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	let { src = undefined } = $$props;
	let { muted = undefined } = $$props;
	let { playsinline = undefined } = $$props;
	let { preload = undefined } = $$props;
	let { autoplay = undefined } = $$props;
	let { controls = undefined } = $$props;
	let { currentTime = undefined } = $$props;
	let { duration = undefined } = $$props;
	let { paused = undefined } = $$props;
	let { node = undefined } = $$props;
	let { processingVideo = false } = $$props;
	const dispatch = createEventDispatcher();

	function video_timeupdate_handler() {
		currentTime = this.currentTime;
		$$invalidate(0, currentTime);
	}

	function video_durationchange_handler() {
		duration = this.duration;
		$$invalidate(1, duration);
	}

	function video_play_pause_handler() {
		paused = this.paused;
		$$invalidate(2, paused);
	}

	function video_binding($$value) {
		binding_callbacks$1[$$value ? 'unshift' : 'push'](() => {
			node = $$value;
			$$invalidate(3, node);
		});
	}

	$$self.$$set = $$new_props => {
		$$invalidate(12, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		if ('src' in $$new_props) $$invalidate(4, src = $$new_props.src);
		if ('muted' in $$new_props) $$invalidate(5, muted = $$new_props.muted);
		if ('playsinline' in $$new_props) $$invalidate(6, playsinline = $$new_props.playsinline);
		if ('preload' in $$new_props) $$invalidate(7, preload = $$new_props.preload);
		if ('autoplay' in $$new_props) $$invalidate(8, autoplay = $$new_props.autoplay);
		if ('controls' in $$new_props) $$invalidate(9, controls = $$new_props.controls);
		if ('currentTime' in $$new_props) $$invalidate(0, currentTime = $$new_props.currentTime);
		if ('duration' in $$new_props) $$invalidate(1, duration = $$new_props.duration);
		if ('paused' in $$new_props) $$invalidate(2, paused = $$new_props.paused);
		if ('node' in $$new_props) $$invalidate(3, node = $$new_props.node);
		if ('processingVideo' in $$new_props) $$invalidate(10, processingVideo = $$new_props.processingVideo);
		if ('$$scope' in $$new_props) $$invalidate(13, $$scope = $$new_props.$$scope);
	};

	$$props = exclude_internal_props($$props);

	return [
		currentTime,
		duration,
		paused,
		node,
		src,
		muted,
		playsinline,
		preload,
		autoplay,
		controls,
		processingVideo,
		dispatch,
		$$props,
		$$scope,
		slots,
		video_timeupdate_handler,
		video_durationchange_handler,
		video_play_pause_handler,
		video_binding
	];
}

class Video extends SvelteComponent$1 {
	constructor(options) {
		super();

		init(this, options, instance$1, create_fragment$1, safe_not_equal$1, {
			src: 4,
			muted: 5,
			playsinline: 6,
			preload: 7,
			autoplay: 8,
			controls: 9,
			currentTime: 0,
			duration: 1,
			paused: 2,
			node: 3,
			processingVideo: 10
		});
	}
}

const Example_svelte_svelte_type_style_lang = '';

/* home/runner/work/gradio/gradio/js/video/Example.svelte generated by Svelte v4.2.2 */
const {
	SvelteComponent,
	add_flush_callback,
	append,
	attr,
	bind,
	binding_callbacks,
	create_component,
	destroy_component,
	detach,
	element,
	empty,
	init: init_1,
	insert,
	is_function,
	mount_component,
	noop,
	safe_not_equal,
	set_data,
	text,
	toggle_class,
	transition_in,
	transition_out
} = window.__gradio__svelte__internal;
function create_else_block(ctx) {
	let div;
	let t;

	return {
		c() {
			div = element("div");
			t = text(/*value*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty & /*value*/ 4) set_data(t, /*value*/ ctx[2]);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

// (18:0) {#if playable()}
function create_if_block(ctx) {
	let div;
	let video_1;
	let updating_node;
	let current;

	function video_1_node_binding(value) {
		/*video_1_node_binding*/ ctx[6](value);
	}

	let video_1_props = {
		muted: true,
		playsinline: true,
		src: /*samples_dir*/ ctx[3] + /*value*/ ctx[2]
	};

	if (/*video*/ ctx[4] !== void 0) {
		video_1_props.node = /*video*/ ctx[4];
	}

	video_1 = new Video({ props: video_1_props });
	binding_callbacks.push(() => bind(video_1, 'node', video_1_node_binding));
	video_1.$on("loadeddata", /*init*/ ctx[5]);

	video_1.$on("mouseover", function () {
		if (is_function(/*video*/ ctx[4].play.bind(/*video*/ ctx[4]))) /*video*/ ctx[4].play.bind(/*video*/ ctx[4]).apply(this, arguments);
	});

	video_1.$on("mouseout", function () {
		if (is_function(/*video*/ ctx[4].pause.bind(/*video*/ ctx[4]))) /*video*/ ctx[4].pause.bind(/*video*/ ctx[4]).apply(this, arguments);
	});

	return {
		c() {
			div = element("div");
			create_component(video_1.$$.fragment);
			attr(div, "class", "container svelte-1jmx6y1");
			toggle_class(div, "table", /*type*/ ctx[0] === "table");
			toggle_class(div, "gallery", /*type*/ ctx[0] === "gallery");
			toggle_class(div, "selected", /*selected*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(video_1, div, null);
			current = true;
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			const video_1_changes = {};
			if (dirty & /*samples_dir, value*/ 12) video_1_changes.src = /*samples_dir*/ ctx[3] + /*value*/ ctx[2];

			if (!updating_node && dirty & /*video*/ 16) {
				updating_node = true;
				video_1_changes.node = /*video*/ ctx[4];
				add_flush_callback(() => updating_node = false);
			}

			video_1.$set(video_1_changes);

			if (!current || dirty & /*type*/ 1) {
				toggle_class(div, "table", /*type*/ ctx[0] === "table");
			}

			if (!current || dirty & /*type*/ 1) {
				toggle_class(div, "gallery", /*type*/ ctx[0] === "gallery");
			}

			if (!current || dirty & /*selected*/ 2) {
				toggle_class(div, "selected", /*selected*/ ctx[1]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(video_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(video_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}

			destroy_component(video_1);
		}
	};
}

function create_fragment(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		return 0;
	}

	current_block_type_index = select_block_type();
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if_block.p(ctx, dirty);
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach(if_block_anchor);
			}

			if_blocks[current_block_type_index].d(detaching);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { type } = $$props;
	let { selected = false } = $$props;
	let { value } = $$props;
	let { samples_dir } = $$props;
	let video;

	async function init() {
		$$invalidate(4, video.muted = true, video);
		$$invalidate(4, video.playsInline = true, video);
		$$invalidate(4, video.controls = false, video);
		video.setAttribute("muted", "");
		await video.play();
		video.pause();
	}

	function video_1_node_binding(value) {
		video = value;
		$$invalidate(4, video);
	}

	$$self.$$set = $$props => {
		if ('type' in $$props) $$invalidate(0, type = $$props.type);
		if ('selected' in $$props) $$invalidate(1, selected = $$props.selected);
		if ('value' in $$props) $$invalidate(2, value = $$props.value);
		if ('samples_dir' in $$props) $$invalidate(3, samples_dir = $$props.samples_dir);
	};

	return [type, selected, value, samples_dir, video, init, video_1_node_binding];
}

class Example extends SvelteComponent {
	constructor(options) {
		super();

		init_1(this, options, instance, create_fragment, safe_not_equal, {
			type: 0,
			selected: 1,
			value: 2,
			samples_dir: 3
		});
	}
}

const Example$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: Example
}, Symbol.toStringTag, { value: 'Module' }));

export { Example as E, Video as V, playable as a, loaded as b, Example$1 as c, loadFfmpeg as l, prettyBytes as p, trimVideo as t };
//# sourceMappingURL=Example-25a38da7.js.map
