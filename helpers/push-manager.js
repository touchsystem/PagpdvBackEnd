var OneSignal = require('onesignal-node');
const AUTH_KEY = 'NTgzNjk2NDktNTg4Yi00YjBiLWJmMzEtNzUzNGEwMmY3MWIz';
const APP_ID = '7a87aab4-dc21-4c55-ae7b-4a040ba02d01';
const USER_AUTH_KEY = 'MGZhOTZmZGMtNThmZC00MmU1LWI3NWQtNjlhMTYzYTVlNmFj';

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */

exports.createDevice = (req, res, next) => {
    var lang = req.body.lang;
    var deviceType = req.body.deviceType;
    var timeZone = req.body.timeZone;
    var date = req.body.date;
    var country = req.body.country;
    var identifier = req.body.identifier;
    var tags = req.body.tags;
    var lat = req.body.lat;
    var lng = req.body.lng; 

    var signalClient = new OneSignal.Client({
        userAuthKey: USER_AUTH_KEY, // Add userAuthKey via config
        app: { appAuthKey: AUTH_KEY, appId: APP_ID}
    });
    devices = {
        ios: 0,
        android: 1,
        amazon: 2,
        windowsphone: 3
    }
    // If you want to add device to current app, don't add app_id in deviceBody
    var deviceBody = {
        device_type: devices[deviceType],
        language: lang,
        identifier: identifier,
        timezone: timezone,
        created_at: date,
        country: country,
        tags: tags,
        lat: lat,
        long: lng
    };
    
    signalClient.addDevice(deviceBody, function (err, httpResponse, data) {
        /**
         * @todo Ver la forma de guardar y vincular a un cliente registrado
         */

    });
}

exports.updateDevice = (req, res, next) => {
    var id = req.params.id;
    /**
    * @todo Call update device when it changes
    */
   var signalClient = new OneSignal.Client({
        userAuthKey: 'XXXXXX',
        app: { appAuthKey: 'XXXXX', appId: 'XXXXX' }
    });

    devices = {
        ios: 0,
        android: 1,
        amazon: 2,
        windowsphone: 3
    }

    var deviceBody = {
        device_type: devices[deviceType],
        language: lang,
        identifier: identifier,
        timezone: timezone,
        created_at: date,
        country: country,
        tags: tags,
        lat: lat,
        long: lng
    };

    signalClient.editDevice(`${id}!`, deviceBody, function (err, httpResponse, data) {
        /**
        * @todo Ver la forma de guardar y vincular a un cliente registrado
        */
    });
}

exports.sendMessageToAllMobile = (req, res, next) => {
    var messages = req.body.messages;
    var titles = req.body.titles;
    var data = req.body.data;
    var url = req.body.url; 
    var small_icon = req.body.small_icon;
    var buttons = req.body.buttons;


    /*

        {
            buttons: [
                {"id": "id1", "text": "button1", "icon": "ic_menu_share"},
                {"id": "id2", "text": "button2", "icon": "ic_menu_send"}
            ]
            data: [
                {
                    "abc": "123", 
                    "foo": "bar"
                }
            ],
            small_icon: 'http://placehold.it',
            url: 'http://google.com/',
            messages: [
                {
                    es: 'Mensaje en español',
                    pt: 'Messagem em Portugues'
                }
            ],
            titles: [
                {
                    "es": "Título en Español",
                    "pt": "Titulo em Portugues"
                }
            ]
        }
    */


    var signalClient = new OneSignal.Client({
        userAuthKey: 'XXXXXX',
        app: { appAuthKey: 'XXXXX', appId: 'XXXXX' }
    });
    var notification = new OneSignal.Notification({
        contents: messages
    });

    // set target users
    notification.setIncludedSegments(['All']);
    notification.setExcludedSegments(['Inactive Users']);
    // set notification parameters
    //notification.setParameter('data', data);
    notification.setParameter('headings', title);
    notification.setParameter('url', url);
    notifiaction.setParameter('buttons', buttons);
    notification.setParameter('small_icon', small_icon);
    //firstNotification.setParameter('send_after', 'Thu Sep 24 2015 14:00:00 GMT-0700 (PDT)');

    // send this notification to All Users except Inactive ones
    signalClient.sendNotification(notification, function (err, httpResponse,data) {
        if (err) {
            console.log('Something went wrong...');
        } else {
            console.log(data, httpResponse.statusCode);
        }
    });
}


exports.sendMessageToGroups = (req, res, next) => {
    var messages = req.body.messages;
    var titles = req.body.titles;
    var data = req.body.data;
    var url = req.body.url;
    var roles = req.body.roles;
    var tags = [];
    /// 
        /*roles: [
            {'Caixa'},
            {'Garcom'}
        ]*/

    /**
     *   
     * 
     * 
     */

    var signalClient = new OneSignal.Client({
        userAuthKey: USER_AUTH_KEY,
        app: { appAuthKey: AUTH_KEY, appId: APP_ID }
    });

    var notifications = new OneSignal.Notification({
        contents: messages
    });

    notifications.setParameter('headings', titles);

    if(typeof url != 'undefined') {
        notifications.setParameter('url', url);
    }

    if(typeof small_icon != 'undefined') {
        notifications.setParameter('chrome_web_icon', small_icon);
    }

    if(typeof badge != 'undefined') {
        notifications.setParameter('chrome_badge', badge);
    }
    if(typeof data != 'undefined') {
        notifications.setParameter('data', data);
    }
    //notification.setParameter('isAnyWeb', true);
    
    for(let i = 0; i < roles.length; i++) {
        tags.push({'field': 'tag', 'key': 'rol'+roles[i].toString(), 'relation': '=', 'value': true});
    }
    notifications.setFilters(tags);

    signalClient.sendNotification(notifications, function(err, httpResponse, data) {
        if (err) {
            console.log('Something went wrong...');
        } else {
            console.log(data);
        }
        res.end();
        
    })
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */

exports.sendMessageToAllWeb = (req, res, next) => {
    // first we need to create a client
    var messages = req.body.messages;
    var titles = req.body.titles;
    var data = req.body.data;
    var url = req.body.url; 

    var signalClient = new OneSignal.Client({
        userAuthKey: USER_AUTH_KEY,
        app: { appAuthKey: AUTH_KEY, appId: APP_ID }
    });

    /*
    
        {
            data: [
                {
                    "abc": "123", 
                    "foo": "bar"
                }
            ],
            small_icon: 'http://placehold.it/',
            badge: 'http://placehold.it/',
            url: 'http://google.com/',
            messages: [
                {
                    es: 'Mensaje en español',
                    pt: 'Messagem em Portugues'
                }
            ],
            titles: [
                {
                    "es": "Título en Español",
                    "pt": "Titulo em Portugues"
                }
            ]
        }

    */

    // we need to create a notification to send
    var notification = new OneSignal.Notification({
        contents: messages,
        headings: titles,
        url: url
    });

    // set target users
    notification.setIncludedSegments(['All']);
    notification.setExcludedSegments(['Inactive Users']);

    // set notification parameters
    ///firstNotification.setParameter('data', data);
    notification.setParameter('isAnyWeb', true);
    notification.setParameter('chrome_web_icon', small_icon);
    notification.setParameter('chrome_badge', badge);
    notification.setParameter('url', url);
    notification.setParameter('headings', titles);
    //firstNotification.setParameter('send_after', 'Thu Sep 24 2015 14:00:00 GMT-0700 (PDT)');

    // send this notification to All Users except Inactive ones
    signalClient.sendNotification(notification, function (err, httpResponse,data) {
    if (err) {
        console.log('Something went wrong...');
    } else {
        console.log(data, httpResponse.statusCode);
    }
    });
}
/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */

exports.sendNotificationToSpecificUsers = (req, res, next) => {
    var clients = req.body.clients;
    var messages = req.body.messages;
    var titles = req.body.titles;
    var data = req.body.data;
    var url = req.body.url; 
    var small_icon = req.body.small_icon;
    var buttons = req.body.buttons;

    var signalClient = new OneSignal.Client({
        userAuthKey: USER_AUTH_KEY,
        app: { appAuthKey: AUTH_KEY, appId: APP_ID}
    });

    /*

        {
            clients: [
                "1dd608f2-c6a1-11e3-851d-000c2940e62c",
                "2dd608f2-c6a1-11e3-851d-000c2940e62c"
            ]
            buttons: [
                {"id": "id1", "text": "button1", "icon": "ic_menu_share"},
                {"id": "id2", "text": "button2", "icon": "ic_menu_send"}
            ]
            data: [
                {
                    "abc": "123", 
                    "foo": "bar"
                }
            ],
            small_icon: 'http://placehold.it',
            url: 'http://google.com/',
            messages: [
                {
                    es: 'Mensaje en español',
                    pt: 'Messagem em Portugues'
                }
            ],
            titles: [
                {
                    "es": "Título en Español",
                    "pt": "Titulo em Portugues"
                }
            ]
        }
    */

    var notification = new OneSignal.Notification({
        contents: messages
    });

    // Send to specific devices, or clients
    notification.setTargetDevices(clients);
    notification.setParameter('small_icon', small_icon);
    notification.setParameter('url', url);
    notification.setParameter('headings', titles);
    notifiaction.setParameter('buttons', buttons);

    signalClient.sendNotification(notification, function (err, httpResponse,data) {
    if (err) {
        console.log('Something went wrong...');
    } else {
        console.log(data);
    }
    });
}