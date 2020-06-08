;"use strict";

function Request() {
    this.agent = window.localStorage.getItem("agent");
    this.session = window.localStorage.getItem("session");
}

{
    const
        signIn = JSON.stringify({
            command: "signin"
        }),
        echo =  JSON.stringify({
            command: "echo"
        }),
        listener = {
            command: "listen"
        },
        TIMEOUT = 5000,
        INTERVAL = 10000;

    let sendEcho;

    Request.prototype = {
        reset: function () {
            window.localStorage.removeItem("agent");

            this.agent = undefined;
        },
        // if !agent return false
        // if session 200
        // if !session 400
        // else fail
        try: function (callback) {
            if (!this.agent) {
                return false;
            }

            const xhr = new XMLHttpRequest();

            xhr.open("POST", this.agent, true);
            xhr.withCredentials = true;

            if (this.session) {
                xhr.setRequestHeader("Session", this.session);
            }

            xhr.onloadend = callback;
            
            xhr.send(signIn);

            return true;
        },
        // if session 200
        // if !session 400
        // else fail
        connect: function (agent, callback) {
            const xhr = new XMLHttpRequest();

            xhr.open("POST", agent, true);
            xhr.withCredentials = true;
            xhr.timeout = TIMEOUT;

            if (this.session) {
                xhr.setRequestHeader("Session", this.session);
            }

            xhr.onloadend = e => {
                switch (xhr.status) {
                case 200:
                case 400:
                    this.agent = agent;

                    window.localStorage.setItem("agent", agent);
                }

                callback.call(xhr);
            }

            xhr.send(signIn);
        },
        // if !agent return false
        // if session 200
        // if !sesssion 401
        // else fail
        signIn: function (username, password, callback) {
            if (!this.agent) {
                return false;
            }

            const xhr = new XMLHttpRequest();

            xhr.open("POST", this.agent, true);
            xhr.withCredentials = true;
            xhr.timeout = TIMEOUT;

            xhr.onloadend = e => {
                switch (xhr.status) {
                case 200:
                    const session = xhr.getResponseHeader("Set-Session");

                    if (session) {
                        this.session = session;

                        window.localStorage.setItem("session", session);
                    }
                }

                callback.call(xhr);
            }

            xhr.send(JSON.stringify({
                command: "signin",
                username: username,
                password: password
            }));

            return true;
        },
        // if !agent || !sesssion return false
        // else fail
        execute: function (request, callback) {
            if (!this.agent || !this.session) {
                return false;
            }

            const xhr = new XMLHttpRequest();
                
            xhr.open("POST", this.agent, true);
            xhr.withCredentials = true;

            xhr.setRequestHeader("Session", this.session);

            xhr.onloadend = callback;

            xhr.send(JSON.stringify(request));

            return true;
        },
        listen: function (callback) {
            if (!this.agent || !this.session) {
                return false;
            }

            const xhr = new XMLHttpRequest();
                
            xhr.open("POST", this.agent, true);
            xhr.withCredentials = true;

            xhr.setRequestHeader("Session", this.session);

            xhr.onloadend = e => {
                if (xhr.status === 200) {
                    const event = JSON.parse(xhr.responseText);

                    callback(event);
                    
                    listener.eventID = event.eventID +1;

                    this.listen(callback);
                } else {
                    callback();
                }
            };
            
            xhr.send(JSON.stringify(listener));

            return true;
        },
        echo: function (callback) {
            if (!this.agent || !this.session) {
                return false;
            }

            const xhr = new XMLHttpRequest();
                
            xhr.open("POST", this.agent, true);
            xhr.withCredentials = true;

            xhr.setRequestHeader("Session", this.session);
            
            xhr.onloadend = e => {
                callback(xhr.status, new Date().getTime() - sendEcho);

                setTimeout(this.echo.bind(this), INTERVAL, callback);
            };

            sendEcho = new Date().getTime();

            try {
                xhr.send(echo);
            } catch (e) {}

            return true;
        }
    };
}