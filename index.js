// Time code based on https://github.com/cpenarrieta/baby-milk-tracker/blob/master/index.js
'use strict';
const Alexa = require('alexa-sdk');
const axios = require('axios');
//const ziptz = require('zipcode-to-timezone');
const moment = require('moment-timezone');

const POSTAL_REQUIRED_ERROR = 'POSTAL_REQUIRED_ERROR'
const GOOGLE_MAP_GEOCODE_EMPTY_RESULT = 'GOOGLE_MAP_GEOCODE_EMPTY_RESULT'
const GOOGLE_MAP_TIMEZONE_EMPTY_RESULT = 'GOOGLE_MAP_TIMEZONE_EMPTY_RESULT'

const APP_ID = undefined;

const SKILL_NAME = 'Menorah Aid';
const GET_FACT_MESSAGE = "Here's your fact: ";
const HELP_MESSAGE = 'You can ask me how many candles you should light, what order to place them in, or, you can say exit... What can I help you with?';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';


const START_DATE = moment('12/2/18')
const nights = [
    START_DATE,
    START_DATE.clone().add(1, 'day'),
    START_DATE.clone().add(2, 'day'),
    START_DATE.clone().add(3, 'day'),
    START_DATE.clone().add(4, 'day'),
    START_DATE.clone().add(5, 'day'),
    START_DATE.clone().add(6, 'day'),
    START_DATE.clone().add(7, 'day'),
]

const handlers = {
    'LaunchRequest': function () {
        this.emit(':ask', "I can tell you how many candles to light or in what order to place them... What would you like to do?", "What can I help you with?");
    },
    'HowManyCandlesIntent': function (input) {
        const ctx = this
        getDate.call(this, (err, dateTime) => {
            if (err) {
                if (err === POSTAL_REQUIRED_ERROR) {
                    ctx.emit(':tell', "Please make sure you have given permission for Menorah Aid to view your postal code in the Alexa App.")
                } else {
                    ctx.emit(':tell', "I'm sorry, something went wrong.")
                }
            } else {
                var night = 0
                for (night = 0; night < 8; night++) {
                    if (dateTime.isSame(nights[night], 'date')) {
                        break
                    }
                }

                if (night >= 8) {
                    ctx.emit(':tell', "It's not CHanukah right now.")
                } else {
                    const speechNight = night + 1;
                    ctx.emit(':tell', "You need to light " + speechNight + " candle" + (speechNight == 1 ? "" : "s") + "tonight. Happy Chanukah!")
                }
                
            }
        })
    },
    'WhatOrderIntent': function() {
        this.emit(':tell', "Place the shamash first. Then, place the other candles from right to left. Finally, use the shamash to light the other candles from left to right. Happy Chanukah!")
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = HELP_MESSAGE;
        const reprompt = HELP_REPROMPT;

        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'SessionEndedRequest': function () {
        console.log("SessionEndedRequest Fulfilled");
    },
    'Unhandled': function () {
        console.log("Unhandled request");
        const speechOutput = HELP_MESSAGE;
        const reprompt = HELP_REPROMPT;

        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};


function getDate(callback) {
    const userId = this.event.session.user.userId
    const consentToken = this.event.session.user.permissions && this.event.session.user.permissions.consentToken
    const deviceId = this.event.context.System.device.deviceId
    let countryCode = ''
    let postalCode = ''
    let lat = 0
    let lng = 0
    let city = ''
    let state = ''
    let timeZoneId = ''

    console.log("Hello!")
    console.log(consentToken)
    
    if (!consentToken || !deviceId) {
        console.error('ERROR updateUserLocation.POSTAL_REQUIRED_ERROR', consentToken, deviceId)
        callback(POSTAL_REQUIRED_ERROR, "")
    }

    axios.get(`https://api.amazonalexa.com/v1/devices/${deviceId}/settings/address/countryAndPostalCode`, {
        headers: { 'Authorization': `Bearer ${consentToken}` }
    })
        .then((response) => {
            if (!response.data || !response.data.countryCode || !response.data.postalCode) {
                console.error('ERROR updateUserLocation.POSTAL_REQUIRED_ERROR', consentToken, deviceId, response.data)
                callback(POSTAL_REQUIRED_ERROR, "")
            } else {
                countryCode = response.data.countryCode
                postalCode = response.data.postalCode
                console.log("Request string: '" + `https://maps.googleapis.com/maps/api/geocode/json?address=${countryCode},${postalCode}&key=${process.env.GOOGLE_MAPS_KEY}` + "'")
                return axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${countryCode},${postalCode}&key=${process.env.GOOGLE_MAPS_KEY}`)
            }
        })
        .then((response) => {
            if (!response.data || !response.data.results || !response.data.results[0] ||
                !response.data.results[0].address_components || !response.data.results[0].geometry) {
                console.error('ERROR updateUserLocation.GOOGLE_MAP_GEOCODE_EMPTY_RESULT', response)
                console.log("country code: " + countryCode + "postal code: " + postalCode)
                callback(GOOGLE_MAP_GEOCODE_EMPTY_RESULT, "")
            } else {
                city = response.data.results[0].address_components[1].short_name
                state = response.data.results[0].address_components[3].short_name
                lat = response.data.results[0].geometry.location.lat
                lng = response.data.results[0].geometry.location.lng
                return axios.get(`https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${moment().unix()}&key=${process.env.GOOGLE_MAPS_KEY}`)
            }
        })
        .then((response) => {
            if (!response.data || !response.data.timeZoneId) {
                console.error('ERROR updateUserLocation.GOOGLE_MAP_TIMEZONE_EMPTY_RESULT', response)
                callback(GOOGLE_MAP_TIMEZONE_EMPTY_RESULT, "")
            } else {
                timeZoneId = response.data.timeZoneId
                const currDate = new moment()
                callback(false, currDate)
            }
        })
        .catch((err) => {
            console.error('ERROR updateUserLocation.POSTAL_REQUIRED_ERROR', err)
            if (!consentToken || !deviceId) {
                callback(POSTAL_REQUIRED_ERROR, "")
            } else {
                callback(true)
            }
        })
}