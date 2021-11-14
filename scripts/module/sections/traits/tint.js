export default {

    _tint: false,

    tint(inColor){

        let hexadecimal = "";
        let decimal = "";

        if(inColor){

            if (!(typeof inColor === "string" || typeof inColor === "number")) throw this.sequence._throwError(this, "tint", `inColor must be of type string (hexadecimal) or number (decimal)!`);

            hexadecimal = (typeof inColor === "number")
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