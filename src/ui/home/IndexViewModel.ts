import { Inject } from "@web-atoms/core/dist/di/Inject";
import { AtomViewModel } from "@web-atoms/core/dist/view-model/AtomViewModel";
import Load from "@web-atoms/core/dist/view-model/Load";
import CompilerService from "../../services/CompilerService";

export default class IndexViewModel extends AtomViewModel {

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

    @Load({ init: true, watch: true, watchDelayMS: 500})
    public async compile() {
        this.target = await this.compilerService.compileAsync(this.source);
    }
}
