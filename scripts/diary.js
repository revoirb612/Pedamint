// 날짜 및 시간 포맷팅 옵션 통일
const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
const timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true };

// 메시지 데이터 모델
function createMessageObject(messageText, selectedEmoji, tags) {
    return {
        id: Date.now().toString(),
        messageText: messageText,
        selectedEmoji: selectedEmoji,
        tags: tags,
        timestamp: Date.now(),
        isArchived: 0, // false 대신 0
        isDeleted: 0   // false 대신 0
    };
}

// 페이지 로드 시 메시지 불러오기
document.addEventListener('DOMContentLoaded', function() {
    loadMessagesFromDB();
});

// 메시지 저장 함수
function saveMessageToDB(message) {
    db.diary.add(message).then(function() {
        // 메시지를 UI에 표시
        renderMessage(message);
    }).catch(function(error) {
        console.error('Failed to save message:', error);
    });
}

// 메시지 로드 함수
function loadMessagesFromDB() {
    db.diary.where('isDeleted').equals(0).toArray().then(function(messages) { // false 대신 0
        // 타임스탬프 기준으로 정렬
        messages.sort((a, b) => b.timestamp - a.timestamp);
        // 메시지들을 UI에 표시하는 함수 호출
        renderMessages(messages);
    }).catch(function(error) {
        console.error('Failed to load messages:', error);
    });
}

// 메시지 삭제 함수
function deleteMessageFromDB(id) {
    db.diary.update(id, { isDeleted: true }).then(function(updated) {
        if (updated) {
            // UI에서 메시지 제거
            removeMessageFromUI(id);
        }
    }).catch(function(error) {
        console.error('Failed to delete message:', error);
    });
}

// 이모지 선택 기능
document.getElementById('selectedEmoji').addEventListener('click', function () {
    document.querySelector('.emoji-dropdown').classList.toggle('show');
});

document.querySelectorAll('.emoji-option').forEach(function (emoji) {
    emoji.addEventListener('click', function () {
        document.getElementById('selectedEmoji').innerText = emoji.innerText;
        document.querySelector('.emoji-dropdown').classList.remove('show');
    });
});

// 태그 입력 기능
const tagContainer = document.getElementById('tagContainer');
const tagInput = document.getElementById('tagInput');
const tags = [];

tagInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const tagText = tagInput.value.trim();
        if (tagText && !tags.includes(tagText)) {
            tags.push(tagText);
            renderTags();
            tagInput.value = '';
        }
    }
});

function renderTags() {
    tagContainer.innerHTML = '';
    tags.forEach((tag, index) => {
        const tagElement = document.createElement('span');
        tagElement.classList.add('tag');
        tagElement.innerText = tag;

        const removeButton = document.createElement('span');
        removeButton.classList.add('remove-tag');
        removeButton.innerText = '×';
        removeButton.onclick = function () {
            tags.splice(index, 1);
            renderTags();
        };

        tagElement.appendChild(removeButton);
        tagContainer.appendChild(tagElement);
    });
}

document.getElementById('sendButton').addEventListener('click', sendMessage);

function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const messageText = chatInput.value.trim();
    const selectedEmoji = document.getElementById('selectedEmoji').innerText;

    if (messageText === '') {
        alert('Please enter a message.');
        return;
    }

    // 메시지 객체 생성
    const message = createMessageObject(messageText, selectedEmoji, [...tags]);

    // 메시지를 IndexedDB에 저장
    saveMessageToDB(message);

    // 입력 필드 초기화
    chatInput.value = '';
    tags.length = 0; // Clear tags after sending the message
    renderTags(); // Refresh tag display
}

// 메시지들을 UI에 렌더링하는 함수
function renderMessages(messages) {
    const messageContainer = document.getElementById('messageContainer');
    messageContainer.innerHTML = ''; // 기존 메시지 제거

    // 날짜별로 메시지 그룹화
    const messagesByDate = {};

    messages.forEach(message => {
        const date = new Date(message.timestamp);

        // 날짜의 자정 타임스탬프 계산
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

        // 표시용 로컬 날짜 문자열
        const formattedDate = date.toLocaleDateString('ko-KR', dateOptions);

        if (!messagesByDate[startOfDay]) {
            messagesByDate[startOfDay] = {
                formattedDate: formattedDate,
                messages: []
            };
        }
        messagesByDate[startOfDay].messages.push(message);
    });

    // 날짜 키를 배열로 추출하고 내림차순으로 정렬
    const sortedDateKeys = Object.keys(messagesByDate).sort((a, b) => b - a);

    // 정렬된 날짜를 기반으로 메시지 렌더링
    sortedDateKeys.forEach(dateKey => {
        const dateGroup = messagesByDate[dateKey];
        const dateSection = document.createElement('div');
        dateSection.id = dateKey;
        dateSection.classList.add('date-section');
        dateSection.innerHTML = `<div class="date-label"><i class="calendar-icon">📅</i> ${dateGroup.formattedDate}</div><div class="message-list"></div>`;
        const messageList = dateSection.querySelector('.message-list');

        // 각 날짜 섹션 내의 메시지를 타임스탬프 기준 **오름차순** 정렬 (오래된 메시지부터)
        const messagesForDate = dateGroup.messages.sort((a, b) => a.timestamp - b.timestamp);

        messagesForDate.forEach(message => {
            renderMessage(message, messageList);
        });

        // 날짜 섹션을 상단에 추가
        messageContainer.appendChild(dateSection);
    });
}

    // 단일 메시지를 렌더링하는 함수
function renderMessage(message, parentElement) {
    const date = new Date(message.timestamp);
    const formattedTime = date.toLocaleTimeString('ko-KR', timeOptions);

    if (!parentElement) {
        // 날짜의 자정 타임스탬프 계산
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

        // 해당 날짜 섹션 찾기
        let dateSection = document.getElementById(startOfDay);
        if (!dateSection) {
            const formattedDate = date.toLocaleDateString('ko-KR', dateOptions);
            dateSection = document.createElement('div');
            dateSection.id = startOfDay;
            dateSection.classList.add('date-section');
            dateSection.innerHTML = `<div class="date-label"><i class="calendar-icon">📅</i> ${formattedDate}</div><div class="message-list"></div>`;
            document.getElementById('messageContainer').prepend(dateSection);
        }

        parentElement = dateSection.querySelector('.message-list');
    }

    const messageItem = document.createElement('div');
    messageItem.classList.add('message');
    messageItem.dataset.id = message.id; // 메시지 ID 저장

    // 메시지 내용 및 삭제 버튼
    // <div onclick="archiveMessage()">아카이브에 보관</div>
    // <div onclick="editMessage(this)">수정하기</div>
    messageItem.innerHTML = `
        <div class="message-bubble sent" onmouseover="showOptions(this)" onmouseout="hideOptions(this)">
            <span class="options-button" data-bs-toggle="dropdown">⋮</span>
            <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="#" onclick="copyMessage(this)">Copy</a></li>
                <li><a class="dropdown-item" href="#" onclick="deleteMessage('${message.id}', this)">Delete</a></li>
            </ul>
            <div class="message-content">
                <p>${message.messageText}</p>
                <div class="tags">${message.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}</div>
                <small>${message.selectedEmoji} ${formattedTime}</small>
            </div>
        </div>
    `;

    // 메시지를 상단에 추가
    parentElement.prepend(messageItem);
}

// 메시지 삭제 시 UI에서 제거하는 함수
function removeMessageFromUI(id) {
    const messageItem = document.querySelector(`.message[data-id='${id}']`);
    if (messageItem) {
        const messageList = messageItem.parentNode;
        const dateSection = messageList.closest('.date-section');
        messageItem.remove();
        if (messageList.children.length === 0) {
            dateSection.remove();
        }
    }
}

// 삭제 기능 업데이트
function deleteMessage(id, element) {
    if (confirm('정말로 이 메시지를 삭제하시겠습니까?')) {
        deleteMessageFromDB(id);

        // 메뉴 닫기
        const messageBubble = element.closest('.message-bubble');
        const menu = messageBubble.querySelector('.options-menu');
        menu.classList.remove('show');
    }
}

// 옵션 메뉴 관련 함수
function showOptions(messageBubble) {
    const optionsButton = messageBubble.querySelector('.options-button');
    optionsButton.style.display = 'block';
}

function hideOptions(messageBubble) {
    const optionsButton = messageBubble.querySelector('.options-button');
    optionsButton.style.display = 'none';
}

function toggleMenu(button) {
    const menu = button.nextElementSibling;
    const isMenuVisible = menu.classList.toggle('show');

    if (isMenuVisible) {
        // 메뉴가 보일 때 문서에 클릭 이벤트 리스너 추가
        document.addEventListener('click', closeMenuOnClickOutside);
    } else {
        // 메뉴가 숨겨질 때 이벤트 리스너 제거
        document.removeEventListener('click', closeMenuOnClickOutside);
    }

    function closeMenuOnClickOutside(event) {
        // 메뉴와 버튼 자체를 제외한 영역을 클릭했을 때 메뉴 닫힘
        if (!menu.contains(event.target) && !button.contains(event.target)) {
            menu.classList.remove('show');
            document.removeEventListener('click', closeMenuOnClickOutside);
        }
    }
}

// 클립보드에 메시지 텍스트 복사 기능
function copyMessage(element) {
    const messageBubble = element.closest('.message-bubble');
    const messageText = messageBubble.querySelector('.message-content p').innerText;

    navigator.clipboard.writeText(messageText)
        .then(() => alert('메시지가 클립보드에 복사되었습니다.'))
        .catch(error => console.error('클립보드 복사에 실패했습니다:', error));

    // 메뉴 닫기
    const menu = messageBubble.querySelector('.options-menu');
    menu.classList.remove('show');
}

// 검색 기능 업데이트
document.getElementById('searchInput').addEventListener('input', filterMessages);

function filterMessages() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();

    db.diary.where('isDeleted').equals(0).toArray().then(function(messages) { // false 대신 0
        const filteredMessages = messages.filter(message => {
            const messageText = message.messageText.toLowerCase();
            const tagsText = message.tags.join(' ').toLowerCase();
            return messageText.includes(query) || tagsText.includes(query);
        });
        renderMessages(filteredMessages);
    }).catch(function(error) {
        console.error('Failed to filter messages:', error);
    });
}