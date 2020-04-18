import Bind from "@web-atoms/core/dist/core/Bind";
import XNode from "@web-atoms/core/dist/core/XNode";
import { AtomControl } from "@web-atoms/core/dist/web/controls/AtomControl";
import { AtomGridSplitter } from "@web-atoms/core/dist/web/controls/AtomGridSplitter";
import { AtomGridView } from "@web-atoms/core/dist/web/controls/AtomGridView";
import IndexViewModel from "./IndexViewModel";

// declare var UMD: any;
// @web-atoms-pack: true
// UMD.map("typescript/lib/typescript", "/node_modules/typescript/lib/typescript.js", "global", "ts");

export default class Index extends AtomGridView {

    public viewModel: IndexViewModel;

    public create() {

        this.viewModel = this.resolve(IndexViewModel);

        this.render(<AtomGridView
            rows="60, *"
            columns="45%, 5, *">

            <header column="0: 3">
                <input
                    placeholder="Url"
                    value={Bind.twoWays(() => this.viewModel.url, ["keyup", "blur", "keydown", "keypress"])}
                    style="width: 90%"/>
            </header>

            <textarea
                row="1"
                column="0"
                value={Bind.twoWays(() => this.viewModel.source,
                    ["keydown", "keyup", "keypress", "change", "blur", "focus"])}
                style="width: 100%; height: 100%;"
                ></textarea>

            <AtomGridSplitter
                row="1"
                column="1"
                />

            <textarea
                row="1"
                column="2"
                value={Bind.oneWay(() => this.viewModel.target)}
                style="width: 100%; height: 100%;"
                ></textarea>

        </AtomGridView>);
    }
}
