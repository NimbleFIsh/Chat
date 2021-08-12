import html from './htmlTemplates.json';
import emoji from './emoji.json';
import emoji_full from './emoji_full.json'

const HOST = 'localhost:3034';
let lastIndex = null;

// Функция перезапуска (сброс хранилища и запуск авторизации)
function rst() {
    delete localStorage['auth'];
    authorization();
}

// Обновление списка онлайн участников
function loadOnline(obj) {
    const players = document.getElementById('players');
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `http://${HOST}/players?id=${obj.id}`, true);
    xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status <= 299) {
            let data = JSON.parse(xhr.response);
            players.getElementsByClassName('player').forEach(el => !el.classList.contains('I') && el.remove());
            data.forEach(el => {
                const li = document.createElement('li');
                li.classList.add('player');
                li.innerText = el;
                players.insertAdjacentElement('beforeend', li);
            });
        } else console.error(xhr.response);
    });
    xhr.send();
}

// Автозамена смайлов в сообщении
function emojiTr(text) {
    const emojiFast = {
        ':D': "\u{1F604}",
        ';D': "\u{1F609}",
        ':3': "\u{1F60A}",
        '<3': "\u{2764}"
   };
   Object.keys(emojiFast).forEach(el => text = text.replaceAll(el, emojiFast[el]));
   return text;
}

// Рендер блока сообщения
function renderBlock(obj, auth) {
    const chat = document.getElementById('chat');
    let li = document.createElement('li');
    li.classList.add('message');
    if (obj.name === 'Server' && obj.id === '1111-1111-1111-1111') li.classList.add('server');
    else if (obj.name === auth.name) li.classList.add('I');
    const dt = new Date(obj.date);
    li.innerHTML = `
        <div class="name_container">
            <span class="name">${obj.name === auth.name ? 'You' : obj.name}</span>
            <span class="date">${dt.toLocaleTimeString().substring(5, 0)} ${dt.toLocaleDateString()}</span>
        </div>
        <div class="msg">${emojiTr(obj.message)}</div>
    `;
    chat.insertAdjacentElement('beforeend', li);
    chat.scrollTop = chat.scrollHeight;
}

// Вывод сообщения об ошибке авторизации
function errAuth(el, inp, erg, errMesg) {
    const label = document.createElement('label');
    label.classList.add('err');
    label.setAttribute('for', 'form_inp');
    label.innerText = errMesg;
    el.insertAdjacentElement('afterbegin', label);
    inp.addEventListener('input', erg);
}

// Авторизация
function authorization() {
    document.body.innerHTML = html.auth;
    document.getElementById('authForm').addEventListener('submit', e => {
        e.preventDefault();
        const el = e.srcElement;
        const inp = el.getElementsByTagName('input')[0];
        const erg = () => el.getElementsByClassName('err')[0].remove();
        if (inp.value !== '') {
            inp.removeEventListener('input', erg);
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `http://${HOST}/`, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status <= 299) {
                    let data = JSON.parse(xhr.response);
                    localStorage['auth'] = JSON.stringify({ 'id': data.id, 'name': inp.value });
                    chat();
                } else errAuth(el, inp, erg, xhr.response);
            });
            xhr.send(JSON.stringify({ 'name': inp.value }));
        } else errAuth(el, inp, erg, 'Ник не может быть пустым!');
    });
}

// Рандомный смайл в кнопке открытия панели смайлов
function rndSmile(e) {
    let currIndex = null;
    if (!document.getElementById("emojiS")) {
        const styleS = document.createElement('style');
        styleS.id = 'emojiS';
        document.head.appendChild(styleS);
    }
    lastIndex = lastIndex ? lastIndex : Math.floor(Math.random() * emoji.length);
    do {
        currIndex = Math.floor(Math.random() * emoji.length);
    } while (currIndex === lastIndex);
    document.getElementById("emojiS").innerHTML = `div.emoji_btn::before { content: "\\${emoji[currIndex]}" }`;
    lastIndex = currIndex;
}

// Создает контейнер для смайлов и выгружает туда смайлы
function createEmojiContainer(target, el) {
    let li = document.createElement('li');
    li.classList.add('emoji');
    li.classList.add(document.getElementsByClassName('emoji').length+2);
    target.insertAdjacentElement('beforeend', li);

    let g = document.getElementsByClassName('emoji');
    g[g.length-1].innerHTML = typeof(el) !== 'string' ? String.fromCharCode(...el) : unescape(el);
    g[g.length-1].addEventListener('click', e => {
        let textarea = document.getElementsByClassName('inp_container')[0].children[0];
        textarea.value += e.srcElement.innerText;
        let lastSmiles = localStorage['lastSmiles'] ? JSON.parse(localStorage['lastSmiles']) : [];
        if (!lastSmiles.includes(escape(e.srcElement.innerText))) {
            lastSmiles.unshift(escape(e.srcElement.innerText));
            localStorage['lastSmiles'] = JSON.stringify(lastSmiles.slice(0, 10));
            const emoji_last = document.getElementById('emoji_last');
            if (emoji_last.childElementCount == 10) emoji_last.children[9].remove();
            let li = document.createElement('li');
            li.classList.add('emoji');
            li.classList.add(document.getElementsByClassName('emoji').length+2);
            li.innerText = e.srcElement.innerText;
            emoji_last.insertAdjacentElement('afterbegin', li);
        }
    });
}

// Окно смайлов
function showEmModal(ev) {
    ev.srcElement.outerHTML += html.emModal;

    let lastSmiles = localStorage['lastSmiles'] ? JSON.parse(localStorage['lastSmiles']) : [];
    const el = document.getElementsByClassName('emoji_btn')[0];
    const emoji_last = document.getElementById('emoji_last');
    const emoji_container = document.getElementById('emoji');
    el.removeEventListener('mouseenter', rndSmile);
    
    lastSmiles.length > 0 && lastSmiles.forEach(el => createEmojiContainer(emoji_last, el));

    emoji_full.forEach(el => createEmojiContainer(emoji_container, el));

    document.getElementById('emoji_container').addEventListener('mouseleave', e => {
        if (e.toElement.classList !== "") {
            if (!e.toElement.classList.contains('emoji_btn')) {
                e.srcElement.remove();
                el.addEventListener('mouseenter', rndSmile);
                el.addEventListener('click', showEmModal);
            }
        }
    });
}

// Сетевое подключение и обработка ответа сервера
function webSocket(auth) {
    const ws = new WebSocket(`ws://${HOST}/?id=${auth.id}&name=${auth.name}`, ["soap", "wamp"]);
    ws.onopen = () => console.info('Opened!');
    ws.onmessage = e => {
        const data = JSON.parse(e.data);
        if (data.name === 'Server' && data.id === '1111-1111-1111-1111') {
            if (data.message.includes('Welcome,')) {
                loadOnline(auth);
                renderBlock(data, auth);
            } else if (data.message.includes('was disconnected')) {
                loadOnline(auth);
                renderBlock(data, auth);
            } else data.message.forEach(msg => renderBlock(JSON.parse(msg), auth));
        } else renderBlock(data, auth);
    };
    ws.onerror = e => console.error('ERROR:', e.message);
    ws.onclose = e => {
        console.info('Closed', e.code, e.reason);
        e.code === 1003 ? rst() : authorization();
    }
    document.getElementById('currentNick').innerText = auth.name;
    document.getElementById('unlogin').addEventListener('click', () => {
        ws.close();
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `http://${HOST}/rm`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.addEventListener('load', () =>
            (xhr.status >= 200 && xhr.status <= 299 && xhr.response === 'Complete') && rst());
        xhr.send(JSON.stringify({ 'id': auth.id }));
    });
    let inp_text = document.getElementsByClassName('inp_container')[0].children;
    inp_text[1].addEventListener('click', () => {
        const msg = {
            'id': auth.id,
            'name': auth.name,
            'message': inp_text[0].value,
            'date': new Date().getTime()
        };
        if (inp_text[0].value !== '') {
            ws.send(JSON.stringify(msg));
            renderBlock(msg, auth);
        }
        inp_text[0].value = '';
    });
    window.addEventListener('keydown', e => {
        if (e.code === 'Enter') {
            e.preventDefault();
            inp_text[1].click();
        }
    });
    document.getElementsByClassName('emoji_btn')[0].addEventListener('click', showEmModal);
}

// Чат
function chat() {
    document.body.innerHTML = html.chat;
    const auth = JSON.parse(localStorage['auth']);
    rndSmile();
    document.getElementsByClassName('emoji_btn')[0].addEventListener('mouseenter', rndSmile);
    webSocket(auth);
}

localStorage['auth'] ? chat() : authorization();