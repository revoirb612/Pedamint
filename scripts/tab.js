document.addEventListener('DOMContentLoaded', function () {
    // Load all tabs from the 'tabs' store
    db.tabs.each(function (tab) {
        addTab(tab);
    });
});

function addTab(tab) {
    // 새 탭 헤더 생성
    var newTab = document.createElement('li');
    newTab.classList.add('nav-item');
    newTab.setAttribute('id', 'tab' + tab.id); // 고유한 ID 설정

    // 탭 내부 HTML 구성
    newTab.innerHTML = `
        <a class="nav-link" id="nav-${tab.id}" data-bs-toggle="pill" href="#content${tab.id}" role="tab">
            <span class="tab-title">${tab.filename}</span>
            <button type="button" class="btn-close" aria-label="Close" style="font-size: 0.8em;"></button>
        </a>`;

    // '+' 버튼 앞에 새 탭 삽입
    var addTabLi = document.getElementById('addTabLi');
    addTabLi.parentNode.insertBefore(newTab, addTabLi);

    // 새로운 탭 내용 생성
    var newTabContent = document.createElement('div');
    newTabContent.classList.add('tab-pane', 'fade');
    newTabContent.setAttribute('id', 'content' + tab.id);
    newTabContent.setAttribute('role', 'tabpanel');
    newTabContent.innerHTML = `
        <iframe id="iframe${tab.id}" src="${tab.content}"></iframe>`;

    document.getElementById('tabBody').appendChild(newTabContent);

    // 새 탭 활성화 시도
    try {
        var newTabLink = document.getElementById('nav-' + tab.id);
        if (newTabLink) {
            var tabInstance = new bootstrap.Tab(newTabLink);  // Bootstrap의 Tab 클래스 사용
            tabInstance.show();  // 새 탭을 활성화
        } else {
            console.error(`탭 링크를 찾을 수 없습니다: nav-${tab.id}`);
        }
    } catch (error) {
        console.error("탭을 활성화하는 중 오류 발생:", error);
    }
}

document.getElementById("addTabButton").addEventListener("click", function() {
    var tabID = Date.now();  // 고유한 tabID 생성

    // 새 탭 객체
    var newTab = {
        id: tabID,
        content: '/static/iframe/widget.html',
        filename: '새 탭'
    };

    // 새 탭을 추가하는 함수 실행
    addTab(newTab);

    // 새 탭 정보를 'tabs' 스토어에 추가 (탭 추가 후 수행)
    db.tabs.put(newTab).then(function() {
        console.log("탭이 DB에 저장되었습니다:", newTab.id);
    }).catch(function(error) {
        console.error("탭을 DB에 저장하는 중 오류 발생:", error);
    });
});

// iframe으로부터 메시지를 수신하는 이벤트 리스너
window.addEventListener('message', function(event) {
    // 메시지의 출처 확인 (실제 출처로 변경 필요)
    if (event.origin !== "https://www.pedamint.com") {
        // 출처가 예상과 다르면 메시지 무시
        return;
    }

    // 탭 제목 업데이트
    // 수정된 코드
    document.querySelector('#tab' + event.data.tabID + ' .tab-title').textContent = event.data.filename;


    // 'tabs' 스토어에서 탭의 내용 업데이트
    db.tabs.update(parseInt(event.data.tabID), { content: event.data.file_url, filename: event.data.filename });
}, false);

// 탭을 제거하는 클릭 이벤트 리스너
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-close')) {
        var tabElement = e.target.closest('li');

        // tabElement가 null인지 확인
        if (!tabElement) {
            console.warn('tabElement가 존재하지 않습니다.');
            return;
        }

        var tabID = tabElement.getAttribute('id').replace('tab', ''); // 'tab' 접두사를 제거하여 탭 ID 추출

        // 클릭된 탭과 그에 대응하는 콘텐츠 제거
        tabElement.remove();
        var contentElement = document.getElementById('content' + tabID);
        if (contentElement) {
            contentElement.remove();
        }

        // 'tabs' 스토어에서 해당 탭 제거
        db.tabs.delete(parseInt(tabID)).then(function() {
            console.log('탭이 DB에서 성공적으로 삭제되었습니다:', tabID);
        }).catch(function(error) {
            console.error('탭을 DB에서 삭제하는 중 오류 발생:', error);
        });
    }
});