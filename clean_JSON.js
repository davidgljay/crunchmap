function clean_JSON(data, cleaning_function) {
	var default_clean = function (text) {
		text = text || '';
		return text.replace(/[^a-zA-Z0-9 #@.,:<>{}[]"'\/]/g,'').replace("\\",'\\')
			.replace(/\'/g, "\'")
			.replace(/\"/g, '\"')
			.replace(/\\n/g, "")
			.replace(/\\&/g, "")
			.replace(/\\r/g, "")
			.replace(/\\t/g, "")
			.replace(/\\b/g, "")
			.replace(/\\f/g, "");
		};

	cleaning_function = cleaning_function || default_clean;

	if (typeof data == 'string') {
		return cleaning_function(data);
	} else if (typeof data == 'object') {
		if (data) {
			Object.keys(data).forEach(function (key) {
				data[key] = clean_JSON(data[key], cleaning_function);
			});
		} else {
			return '';
		}
		return data;
	} else if (typeof data == 'number') {
		return data;
	};
};

module.exports = clean_JSON; 