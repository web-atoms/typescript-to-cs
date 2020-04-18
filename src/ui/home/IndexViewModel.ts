import { Inject } from "@web-atoms/core/dist/di/Inject";
import { AtomViewModel } from "@web-atoms/core/dist/view-model/AtomViewModel";
import Load from "@web-atoms/core/dist/view-model/Load";
import CompilerService from "../../services/CompilerService";
import { CancelToken } from "@web-atoms/core/dist/core/types";
import FileService from "../../services/FileService";

export default class IndexViewModel extends AtomViewModel {

    public url: string = "/src/samples/scanner.ts";

    @Inject
    public compilerService: CompilerService;

    public source: string = `class A {

        public do() {

        }

     }

     function a(b: number, c: A): string {
         var a = 10;
         const n1 = c === undefined;
         return a.toString();
     }`;

    public target: string;

    @Inject
    private fileService: FileService;

    @Load({ init: true,  watch: true, watchDelayMS: 500 })
    public async loadUrl(ct: CancelToken) {
        const url = this.url;
        if (!url) { return; }
        this.source = await this.fileService.getSource(this.url, ct);
    }

    @Load({ init: true, watch: true, watchDelayMS: 500})
    public async compile(ct: CancelToken) {
        let s = this.source;
        this.target = await this.compilerService.compileAsync(s);
    }
}
