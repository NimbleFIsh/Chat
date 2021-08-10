import html from './htmlTemplates.json';

// Этап реализации UI

if (!localStorage['url'])
    localStorage['url'] = prompt('Enter URL for connections');
const HOST = localStorage['url'];

function rst() {
    delete localStorage['auth'];
    app();
}

function app() {
    if (!localStorage['auth']) {
        document.body.innerHTML = html.auth;
        document.getElementById('authForm').addEventListener('submit', e => {
            e.preventDefault();
            const el = e.srcElement;
            const inp = el.getElementsByTagName('input')[0];
            const erg = e => el.getElementsByClassName('err')[0].remove();
            if (inp.value !== '') {
                inp.removeEventListener('input', erg);
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `http://${HOST}/`, true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status <= 299) {
                        let data = JSON.parse(xhr.response);
                        localStorage['auth'] = JSON.stringify({
                            'id': data.id,
                            'name': inp.value
                        });
                        app();
                    }
                });
                xhr.send(JSON.stringify({ 'name': inp.value }));
            } else {
                const label = document.createElement('label');
                label.classList.add('err');
                label.setAttribute('for', 'form_inp');
                label.innerText = 'Ник не может быть пустым!';
                el.insertAdjacentElement('afterbegin', label);
                inp.addEventListener('input', erg);
            }
        });
    } else {
        document.body.innerHTML = html.chat;
        const auth = JSON.parse(localStorage['auth']);
        document.getElementById('currentNick').innerText = auth.name;
        document.getElementById('unlogin').addEventListener('click', e => {
            ws.close();
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `http://${HOST}/rm`, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status <= 299) {
                    if (xhr.response === 'Complete') rst();
                }
            });
            xhr.send(JSON.stringify({ 'id': auth.id }));
        });
        const ws = new WebSocket(`ws://${HOST}/?id=${auth.id}&name=${auth.name}`, ["soap", "wamp"]);
        ws.onopen = () => console.info('Opened!');
        ws.onmessage = e => console.log(JSON.parse(e.data));
        ws.onerror = e => console.error('ERROR:', e.message);
        ws.onclose = e => {
            console.info('Closed', e.code, e.reason);
            if (e.code === 1003) rst();
            else app();
        }
        // ws.send(
        //     JSON.stringify({
        //         'id': 'abb5c4f7-18be-4ee1-ac85-2bfea0e20477',
        //         'name': 'NimbleFish',
        //         'message': 'Don\'t HEX pls',
        //         'date': new Date().getTime()
        //     })
        //     );
        // });
    }
}

app();