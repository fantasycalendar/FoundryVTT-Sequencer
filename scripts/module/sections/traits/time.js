export default {

	_startTime: false,
	_startPerc: false,
	_endTime: false,
	_endPerc: false,

	startTime(inMs){
		this._startTime = inMs;
		this._startPerc = false;
		return this;
	},

	startTimePerc(inPerc){
		this._startTime = inPerc;
		this._startPerc = true;
		return this;
	},

	endTime(inMs){
		this._endTime = inMs;
		this._endPerc = false;
		return this;
	},

	endTimePerc(inPerc){
		this._endTime = inPerc;
		this._endPerc = true;
		return this;
	}

}