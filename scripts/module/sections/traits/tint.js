import { is_real_number } from "../../lib/lib.js";

export default {

    _tint: null,

    tint(inColor){

        let hexadecimal = "";
        let decimal = "";

        if(inColor){

            if (!is_real_number(inColor) && typeof inColor !== "string") throw this.sequence._customError(this, "tint", `inColor must be of type string (hexadecimal) or number (decimal)!`);

            hexadecimal = is_real_number(inColor)
                ? inColor.toString(16)
                : inColor;

            decimal = (typeof inColor === "string" && inColor.startsWith("#"))
                ? parseInt(inColor.slice(1), 16)
                : inColor;
        }


        this._tint = {
            hexadecimal,
            decimal
        };

        return this;
    }

}