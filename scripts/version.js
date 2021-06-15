export default class Version {

    constructor(inString){
        this.major = 0;
        this.minor = 0;
        this.patch = 0;
        if(!inString) inString = game.data.version;
        [this.major, this.minor, this.patch] = inString.split('.').map(x => Number(x));
    }

    onOrAfter(inVersion){
        if(typeof inVersion === "string") inVersion = new Version(inVersion);
        return (this.major > inVersion.major)
            || (this.major === inVersion.major && this.minor > inVersion.minor)
            || (this.major === inVersion.major && this.minor === inVersion.minor && this.patch >= inVersion.patch);
    }

}