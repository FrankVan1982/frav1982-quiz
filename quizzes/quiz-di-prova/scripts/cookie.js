//=========================================
// File name: cookie.js
//-----------------------------------------
// Project : QuizFaber 4.1.9
// Licence : GNU General Public License v3.0
// Author  : Luca Galli
// Email   : info@quizfaber.com
//-----------------------------------------
// Functions included in this file:
// - setCookie()
// - setSessionCookie()
// - setShortCookie
// - getCookie()
// - deleteCookie()
// - deleteSessionCookie()
//
// Useful documentation:
// please see : https://javascript.info/cookie
//=========================================

const MAX_COOKIE_SIZE = 4000;  // less than 4096
//const OTHER_COOKIE_ATTRIBUTES = "path=/; samesite=None; Secure";
//const OTHER_COOKIE_ATTRIBUTES = "samesite=strict; path=/";
const OTHER_COOKIE_ATTRIBUTES = "path=/; samesite=None; Secure";


function WriteCookie(name, value, expires)
{
    var cookieStr = name + "=" + value;

    if (expires) {
        cookieStr += "; expires=" + expires;
    }

    document.cookie = cookieStr + "; " + OTHER_COOKIE_ATTRIBUTES;
}

//----------------
// SALVA il cookie
//----------------
// Memorizza il cookie nel seguente formato:
//
// cookie_name=cookie_value; expires=time
//
// dove:
// - cookie_name   = "Qmake" + numero di versione
// - cookie_value  = titolo del quiz
// - time          = durata (in minuti)
// ---------------------------
function setCookie(cookie_name,cookie_value,minuti)
{
    var expdate= new Date();  // data di scadenza

    expdate.setTime(expdate.getTime()+(60000*minuti));

    //document.cookie = cookie_name + "=" + encodeURIComponent(cookie_value) + "; expires=" + expdate.toGMTString() + "; samesite=strict; path=/";
    WriteCookie(cookie_name, encodeURIComponent(cookie_value), expdate.toGMTString());
}

//----------------
// SALVA il cookie che dura finchè il browser è aperto, ovvero durata di una sessione
//----------------
function setSessionCookie(cookie_name,cookie_value)
{
    var escapedCookieValue = encodeURIComponent(cookie_value);

    if (escapedCookieValue.length < MAX_COOKIE_SIZE)
    {
        //document.cookie = cookie_name + "=" + escapedCookieValue + "; samesite=strict; path=/";
        WriteCookie(cookie_name, escapedCookieValue);
    }
    else
    {
        setSplittedSessionCookie(cookie_name, escapedCookieValue);        
    }
}

function setSplittedSessionCookie(cookie_name, escapedCookieValue)
{
    var cookieNamePartial;
    var cookieValuePartial;
    var startIndex = 0;
    var numOfCookies = Math.floor(escapedCookieValue.length / MAX_COOKIE_SIZE) + (escapedCookieValue.length % MAX_COOKIE_SIZE > 0 ? 1 : 0);

    //document.cookie = cookie_name + "=splitted" + numOfCookies.toString() + "; samesite=strict; path=/";
    WriteCookie(cookie_name, "splitted" + numOfCookies.toString());

    for (var i = 0; i < numOfCookies; i++) {
        cookieNamePartial = cookie_name + (i + 1).toString();
        if (i === numOfCookies - 1) {
            cookieValuePartial = escapedCookieValue.substring(startIndex);
        }
        else {
            // do not truncate %NN, preserve the entire three characters
            var offset = 0;
            if ((escapedCookieValue.charAt(startIndex + MAX_COOKIE_SIZE - 1) !== '%') && (escapedCookieValue.charAt(startIndex + MAX_COOKIE_SIZE - 2) !== '%')) {
                cookieValuePartial = escapedCookieValue.substring(startIndex, startIndex + MAX_COOKIE_SIZE);
            }
            else if (escapedCookieValue.charAt(startIndex + MAX_COOKIE_SIZE - 1) !== '%') {
                offset = 2;
                cookieValuePartial = escapedCookieValue.substring(startIndex, startIndex + MAX_COOKIE_SIZE + 2);
            }
            else if (escapedCookieValue.charAt(startIndex + MAX_COOKIE_SIZE - 2) !== '%') {
                offset = 1;
                cookieValuePartial = escapedCookieValue.substring(startIndex, startIndex + MAX_COOKIE_SIZE + 1);
            }
        }
        startIndex += MAX_COOKIE_SIZE + offset;

        //document.cookie = cookieNamePartial + "=" + cookieValuePartial + "; samesite=strict; path=/";
        WriteCookie(cookieNamePartial, cookieValuePartial);
    }
}

//----------------
// SALVA un cookie temporaneo (con durata prestabilita)
//----------------
function setShortCookie(cookie_name, cookie_value, millisec)
{
    var expdate = new Date();  // data di scadenza

    expdate.setTime(expdate.getTime() + millisec);

    //document.cookie = cookie_name + "=" + encodeURIComponent(cookie_value) + "; expires=" + expdate.toGMTString() + "; samesite=strict; path=/";
    WriteCookie(cookie_name, encodeURIComponent(cookie_value), expdate.toGMTString());
}

//-----------------
// CARICA il cookie
//-----------------
function getCookie(cookie_name)
{
    var nameEq = cookie_name + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++)
    {
        var c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEq) === 0) {
            var cookieValue = decodeURIComponent(c.substring(nameEq.length, c.length));
            if (!cookieValue.startsWith("splitted")) return cookieValue;
            return getSplittedCookies(cookie_name, cookieValue);
        }
    }
    return "";  // lettura fallita
}

function getSplittedCookies(cookie_name, cookieValueHeader)
{
    var cookieValue = "";
    var numOfCookies = parseInt(cookieValueHeader.replace("splitted", ""));
    for (var i = 0; i < numOfCookies; i++)
    {
        cookieNamePartial = cookie_name + (i + 1).toString();
        cookieValue += getPartialCookie(cookieNamePartial);
    }
    return decodeURIComponent(cookieValue);
}

function getPartialCookie(cookie_name)
{
    var nameEq = cookie_name + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEq) === 0) {
            return c.substring(nameEq.length, c.length);
        }
    }
    return "";  // lettura fallita
}


//-----------------
// Delete cookie
//-----------------
function deleteCookie(cookie_name) 
{
    //document.cookie = cookie_name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; samesite=strict; path=/';
    WriteCookie(cookie_name, "", "Thu, 01 Jan 1970 00:00:01 GMT");
}

//-----------------
// Remove cookie from session
//-----------------
function deleteSessionCookie(cookie_name)
{
    //document.cookie = cookie_name + "=; samesite=strict; path=/";
    WriteCookie(cookie_name, "");
}
