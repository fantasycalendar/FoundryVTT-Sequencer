import filters from "../../lib/filters.js";

export default {

	_filters: false,

	_addFilter(inFilterName, inData, inName=false){
		if(!this._filters) this._filters = {};
		this._filters[inFilterName] = {
			name: inName,
			data: inData
		};
	},

	_testFilter(inFilterName, inData){
		let filter = new filters[inFilterName](inData);
		if(!filter.isValid) throw this.sequence._throwError(this, "filter", `Could not create ${inFilterName} filter - data is malformed!`);
	},

	filter(inFilterName, inData = {}, inName=""){
		if(typeof inFilterName !== "string") throw this.sequence._throwError(this, "filter", `inFilterName must be of type string`);
		if(!Object.keys(filters).includes(inFilterName)) throw this.sequence._throwError(this, "filter", `"${inFilterName}" does not exist`);
		this._testFilter(inFilterName, inData);
		this._addFilter(inFilterName, inData, inName);
		return this;
	}


}