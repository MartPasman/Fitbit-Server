/**
 * Created on 01-06-17.
 */

/**
 * Get the date of today "zero'ed out" to compare them by day
 * @returns {Date}
 */
function today() {
    return new Date(getYYYYMMDD(new Date(), '-'));
}

/**
 * Get a date "zero'ed out" to compare them by day
 * @param date
 * @returns {Date}
 */
function day(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    return new Date(getYYYYMMDD(date, '-'));
}

/**
 *
 * @param date
 * @param splitBy
 * @returns {string}
 */
function getYYYYMMDD(date, splitBy) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }

    var mm = date.getMonth() + 1;
    var dd = date.getDate();

    return [date.getFullYear(),
        (mm > 9 ? '' : '0') + mm,
        (dd > 9 ? '' : '0') + dd
    ].join(splitBy);
}

/**
 * @return {string}
 */
function NLDatetoUNIDate(dateString) {
    const UNIYear = dateString.substring(7, 11);
    const UNIMonth = dateString.substring(3, 5);
    const UNIDay = dateString.substring(0, 2);
    return (UNIYear + '-' + UNIMonth + '-' + UNIDay);
}

/**
 *
 * @param code
 * @param message
 * @param depth
 */
function logResponse(code, message, depth) {
    if (depth === undefined) depth = '\t';
    if (message === undefined) message = '';
    if (code === undefined) return;

    const COLOR_200 = '\u001B[32m';
    const COLOR_300 = '\u001B[33m';
    const COLOR_400 = '\u001B[31m';
    const COLOR_500 = '\u001B[34m';
    const COLOR_RESET = '\u001B[0m';

    var color = COLOR_200;
    if (code >= 300) color = COLOR_300;
    if (code >= 400) color = COLOR_400;
    if (code >= 500) color = COLOR_500;

    console.log(depth + color + code + COLOR_RESET + ' ' + message + '\n');
}


module.exports.logResponse = logResponse;
module.exports.getYYYYMMDD = getYYYYMMDD;
module.exports.NLDatetoUNIDate = NLDatetoUNIDate;
module.exports.today = today;
module.exports.day = day;
