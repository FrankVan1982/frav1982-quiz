//=========================================
// File name: storage.js
//-----------------------------------------
// Project : QuizFaber 4.1.9
// Licence : GNU General Public License v3.0
// Author  : Luca Galli
// Email   : info@quizfaber.com
//-----------------------------------------
// External functions included in this file:
// - StoreValue()
// - RetrieveString()
// - RemoveValue()
//=========================================

//------------------------------------------
// Get the Web Storage 
//------------------------------------------
function GetStorage()
{
	var storage = null;

	try 
    {
        if (options.useSessionStorage)
        {
            storage = window.sessionStorage; // store data on a temporary basis, for a single window (or tab). The data disappears when session ends i.e. when the user closes that window (or tab).
        }
        else
        {
            storage = window.localStorage; // store data for your entire website, permanently.
        }
	}
	catch(err)
	{
	}
	return storage; 
}

//------------------------------------------
// Store a string in the Web Storage (or into cookie)
//------------------------------------------
function StoreValue(field_name, field_value)
{
	var webStorage = GetStorage();
	
    if (webStorage)
    {
        webStorage.setItem(field_name, field_value);
    }
    else
    {
        setSessionCookie(field_name, field_value);
    }
}

//------------------------------------------
//  Read a string from Web Storage (or from cookies)
//------------------------------------------
function RetrieveString(field_name)
{
	var webStorage = GetStorage();
    var field_value;
	
    if (webStorage)
    {
        field_value = webStorage.getItem(field_name);
    }
    else
    {
        field_value = getCookie(field_name);
    }
    return field_value;
}

//------------------------------------------
// Remove a entry from Web Storage (or from cookies)
//------------------------------------------
function RemoveValue(field_name)
{
	var webStorage = GetStorage();
	
    if (webStorage)
    {
        webStorage.removeItem(field_name);
    }
    else
    {
        deleteCookie(field_name);
    }
}
