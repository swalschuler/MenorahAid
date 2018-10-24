/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills
 * nodejs skill development kit.
 * This sample supports multiple lauguages. (en-US, en-GB, de-DE).
 * The Intent Schema, Custom Slots and Sample Utterances for this skill, as well
 * as testing instructions are located at https://github.com/alexa/skill-sample-nodejs-fact
 **/

'use strict';
const Alexa = require('alexa-sdk');
const axios = require('axios');
//const ziptz = require('zipcode-to-timezone');
const moment = require('moment-timezone');

const POSTAL_REQUIRED_ERROR = 'POSTAL_REQUIRED_ERROR'
const GOOGLE_MAP_GEOCODE_EMPTY_RESULT = 'GOOGLE_MAP_GEOCODE_EMPTY_RESULT'
const GOOGLE_MAP_TIMEZONE_EMPTY_RESULT = 'GOOGLE_MAP_TIMEZONE_EMPTY_RESULT'

//=========================================================================================================================================
//TODO: The items below this comment need your attention.
//=========================================================================================================================================

//Replace with your app ID (OPTIONAL).  You can find this value at the top of your skill's page on http://developer.amazon.com.
//Make sure to enclose your value in quotes, like this: const APP_ID = 'amzn1.ask.skill.bb4045e6-b3e8-4133-b650-72923c5980f1';
const APP_ID = undefined;

const SKILL_NAME = 'Space Facts';
const GET_FACT_MESSAGE = "Here's your fact: ";
const HELP_MESSAGE = 'You can say tell me a space fact, or, you can say exit... What can I help you with?';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';

//=========================================================================================================================================
//TODO: Replace this data with your own.  You can find translations of this data at http://github.com/alexa/skill-sample-node-js-fact/data
//=========================================================================================================================================
const data = [
    'A year on Mercury is just 88 days long.',
    'Despite being farther from the Sun, Venus experiences higher temperatures than Mercury.',
    'Venus rotates counter-clockwise, possibly because of a collision in the past with an asteroid.',
    'On Mars, the Sun appears about half the size as it does on Earth.',
    'Earth is the only planet not named after a god.',
    'Jupiter has the shortest day of all the planets.',
    'The Milky Way galaxy will collide with the Andromeda Galaxy in about 5 billion years.',
    'The Sun contains 99.86% of the mass in the Solar System.',
    'The Sun is an almost perfect sphere.',
    'A total solar eclipse can happen once every 1 to 2 years. This makes them a rare event.',
    'Saturn radiates two and a half times more energy into space than it receives from the sun.',
    'The temperature inside the Sun can reach 15 million degrees Celsius.',
    'The Moon is moving approximately 3.8 cm away from our planet every year.',
];

//=========================================================================================================================================
//Editing anything below this line might break your skill.
//=========================================================================================================================================
/*
function getDate() {
    const apiAccessToken = this.event.context.System.apiAccessToken;
    const deviceId = this.event.context.System.device.deviceId;
    let countryCode = '';
    let postalCode = '';

    axios.get(`https://api.amazonalexa.com/v1/devices/${deviceId}/settings/address/countryAndPostalCode`, {
      headers: { 'Authorization': `Bearer ${apiAccessToken}` }
    })
    .then((response) => {
        countryCode = response.data.countryCode;
        postalCode = response.data.postalCode;
        const tz = ziptz.lookup( postalCode );
        const currDate = new moment();
        const userDatetime = currDate.tz(tz).format('YYYY-MM-DD HH:mm');
        console.log('Local Timezone Date/Time::::::: ', userDatetime);
    })
}
*/
const handlers = {
    'LaunchRequest': function () {
        this.emit('HowManyCandlesIntent');
    },
    'HowManyCandlesIntent': function (input) {
        const factArr = data;
        const factIndex = Math.floor(Math.random() * factArr.length);
        const randomFact = factArr[factIndex];

        const speechOutput = "Hello";//GET_FACT_MESSAGE + randomFact;

        const ctx = this
        getDate.call(this, (err, dateTime) => {
            if (err) {
                if (err === POSTAL_REQUIRED_ERROR) {
                    ctx.emit(':tell', "please give permission")
                } else {
                    ctx.emit(':tell', "something went wrong")
                }
            } else {
                ctx.emit(':tell', "Got the date")
            }
        })

        //this.response.cardRenderer(SKILL_NAME, randomFact);
        //this.response.speak(speechOutput);
        //this.emit(':responseReady');
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
                const userDatetime = currDate.tz(timeZoneId).format('YYYY-MM-DD HH:mm')
                callback(false, userDatetime)
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