import { CancelToken } from "@web-atoms/core/dist/core/types";
import DISingleton from "@web-atoms/core/dist/di/DISingleton";
import { BaseService } from "@web-atoms/core/dist/services/http/RestService";

@DISingleton()
export default class FileService extends BaseService {

    public async getSource(url: string, ct: CancelToken): Promise<string> {
        const r = await super.ajax(url, { method: "get", cancel: ct });
        return r.responseText || "";
    }

}
