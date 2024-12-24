document.addEventListener('DOMContentLoaded', function() {
    var secretKey = "{{ contents_secret_key }}";
    var calendarEl = document.getElementById('calendar');
    var colorOptions = document.querySelectorAll('.color-option');

    colorOptions.forEach(function(option) {
        option.addEventListener('click', function() {
            // 모든 옵션에서 'selected' 클래스 제거
            colorOptions.forEach(function(opt) {
                opt.classList.remove('selected');
            });
            // 클릭된 옵션에 'selected' 클래스 추가
            option.classList.add('selected');
            // 숨겨진 입력 필드 값 업데이트
            document.getElementById('event-color').value = option.dataset.color;
        });
    });

    function updateDataChangedFlag(value) {
        var currentTime = new Date().toISOString();
        return db.meta.put({key: 'eventsChanged', value: value, lastUpdated: currentTime});
    }

    function updateDataChangedFlag(value) {
        var currentTime = new Date().toISOString();
        return db.meta.put({key: 'eventsChanged', value: value, lastUpdated: currentTime});
    }

    function saveEvents(calendar) {
        var events = calendar.getEvents().map(e => {
            var event = e.toPlainObject();

            // 기존 데이터 형식과 호환성을 위해 암호화를 제거
            event.title = event.title; // 암호화 제거
            event.content = event.extendedProps.content || '';
            event.tags = event.extendedProps.tags || [];

            event.id = e.id || Date.now();
            return event;
        });
        db.events.clear().then(function() {
            db.events.bulkPut(events).then(function() {
                updateDataChangedFlag(true);
            });
        });
    }

    function loadEvents(calendar) {
        db.events.toArray().then(function(events) {
            var eventsToSave = []; // 복호화되어 다시 저장해야 하는 이벤트 목록
            var eventsToAdd = []; // 캘린더에 추가할 이벤트 목록

            events.forEach(function(event) {
                var needsSave = false;

                try {
                    if (isEncrypted(event.title)) {
                        event.title = decrypt(event.title);
                        needsSave = true;
                    }
                    if (isEncrypted(event.content)) {
                        event.content = decrypt(event.content);
                        needsSave = true;
                    }
                    if (event.tags) {
                        event.tags = event.tags.map(tag => {
                            if (isEncrypted(tag)) {
                                needsSave = true;
                                return decrypt(tag);
                            }
                            return tag;
                        });
                    } else {
                        event.tags = [];
                    }
                } catch (error) {
                    console.error("Error decrypting event:", event, error);
                }

                if (needsSave) {
                    eventsToSave.push(event);
                }

                eventsToAdd.push({
                    ...event,
                    extendedProps: {
                        content: event.content,
                        tags: event.tags
                    },
                    id: event.id || Date.now()
                });
            });

            // 필요한 경우에만 이벤트를 저장합니다.
            if (eventsToSave.length > 0) {
                db.events.bulkPut(eventsToSave).then(function() {
                    updateDataChangedFlag(true);
                });
            }

            // 이벤트를 한 번에 캘린더에 추가합니다.
            calendar.addEventSource(eventsToAdd);
        });
    }


    function replaceEvents(data) {
        calendar.removeAllEvents();
        data.forEach(event => {
            // 암호화된 데이터를 복호화하거나, 그대로 사용
            event.title = isEncrypted(event.title) ? decrypt(event.title) : event.title;
            calendar.addEvent({
                ...event,
                id: event.id || Date.now()
            });
        });
        calendar.render();
    }

    function isEncrypted(data) {
        // 간단히 암호화 여부를 확인하는 로직 (AES 암호화 문자열은 특정 패턴을 따름)
        return typeof data === 'string' && data.startsWith('U2FsdGVkX1');
    }

    function decrypt(data) {
        try {
            return CryptoJS.AES.decrypt(data, secretKey).toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Decryption failed:', error);
            return data; // 복호화 실패 시 원본 데이터 반환
        }
    }

    var calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'ko',
        initialView: 'timeGridWeek',
        validRange: {
          start: '2024-03-01', // 표시 시작 날짜
          end: '2025-02-29',   // 표시 끝 날짜 (윤년 고려)
        },
        customButtons: {
            actions: {
                text: '작업',
                click: function() {
                    // 클릭 이벤트는 빈 함수로 둡니다.
                }
            },
            todayCustom: {
                text: '☀️',
                click: function() {
                    calendar.today();
                    // 'schoolYear' 뷰에서도 오늘 날짜로 포커스 이동
                    if (calendar.view.type === 'schoolYear') {
                        var today = new Date();
                        calendar.gotoDate(today);
                    }
                }
            },
        },
        headerToolbar: {
            left: 'timeGridWeek,schoolYear actions',
            center: 'title',
            right: 'todayCustom prev,next'
        },
        views: {
            schoolYear: {
                type: 'dayGrid',
                buttonText: '학년도',
                dateIncrement: { years: 1 },
                visibleRange: function() {
                    var today = new Date();
                    var startYear = today.getFullYear();
                    var startMonth = today.getMonth();

                    if (startMonth < 2) { // If it's January or February
                        startYear -= 1;
                    }

                    var start = new Date(startYear, 2, 1); // March 1st
                    var end = new Date(startYear + 1, 2, 1); // Next year's March 1st

                    return { start: start, end: end };
                }
            }
        },
        buttonText: {
            month: '월',
            week: '주',
            day: '일',
            list: '목록',
            timeGridWeek: '5',
            schoolYear: '190+'
        },
        slotDuration: '00:10:00',
        slotMinTime: '08:30:00',
        slotMaxTime: '16:30:00',
        slotLabelFormat: {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true, // 12시간 형식 사용
        },
        defaultTimedEventDuration: '00:40:00',
        editable: true,
        eventResizableFromStart: true,
        eventStartEditable: true,
        selectable: true,
        nowIndicator: true,
        hiddenDays: [ 0, 6 ],
        allDayText: '행사',
        dateClick: function(info) {
            if (info.view.type === 'dayGridYear' || info.view.type === 'schoolYear') {
                // 연간 뷰에서 날짜를 클릭하면 해당 날짜의 주간 뷰로 이동
                calendar.changeView('timeGridWeek', info.date);
            } else {
                // 그 외의 뷰에서는 새로운 이벤트를 추가
                var newEvent = {
                    id: Date.now(),
                    title: "새 이벤트",
                    start: info.dateStr,
                    allDay: info.allDay,
                    extendedProps: {
                        content: '',
                        tags: []
                    }
                };
                calendar.addEvent(newEvent);
                saveEvents(calendar);
            }
        },
        eventContent: function(arg) {
            var currentView = arg.view.type;

            // 제목 요소 생성
            var titleEl = document.createElement('div');
            titleEl.className = 'fc-event-title';
            titleEl.innerHTML = arg.event.title;

            // 반환할 DOM 노드 배열 생성
            var arrayOfDomNodes = [ titleEl ];

            // timeGrid 타입의 뷰에서만 내용과 태그를 표시
            if (currentView.startsWith('timeGrid')) {
                // 내용 요소 생성
                var contentEl = document.createElement('div');
                contentEl.className = 'content';
                contentEl.innerHTML = arg.event.extendedProps.content || '';

                // 태그 요소 생성
                var tagsEl = document.createElement('div');
                tagsEl.className = 'tags';
                if (arg.event.extendedProps.tags && arg.event.extendedProps.tags.length > 0) {
                    tagsEl.innerHTML = '태그: ' + arg.event.extendedProps.tags.join(', ');
                }

                if (contentEl.innerHTML) {
                    arrayOfDomNodes.push(contentEl);
                }
                if (tagsEl.innerHTML) {
                    arrayOfDomNodes.push(tagsEl);
                }
            }

            return { domNodes: arrayOfDomNodes };
        },
        eventChange: function(info) {
            saveEvents(calendar);
        },
        eventClick: function(info) {
            // 모달 요소 가져오기
            var eventModalEl = document.getElementById('eventModal');
            var eventModal = new bootstrap.Modal(eventModalEl, {
                backdrop: 'static'
            });

            // 버튼 요소 가져오기
            var saveButton = document.getElementById('save-event');
            var deleteButton = document.getElementById('delete-event');

            // 기존 이벤트 리스너 제거
            saveButton.removeEventListener('click', saveButton._listener);
            deleteButton.removeEventListener('click', deleteButton._listener);

            // 새로운 이벤트 리스너 함수 정의
            function saveEventListener() {
                var title = document.getElementById('event-title').value.trim();
                var color = document.getElementById('event-color').value;
                var content = document.getElementById('event-content').value.trim();
                var tagsInput = document.getElementById('event-tags').value.trim();

                var tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];

                if (title) {
                    info.event.setProp('title', title);
                    info.event.setProp('backgroundColor', color);
                    info.event.setProp('borderColor', color);

                    // extendedProps 업데이트
                    info.event.setExtendedProp('content', content);
                    info.event.setExtendedProp('tags', tags);

                    bootstrap.Modal.getInstance(eventModalEl).hide();
                    saveEvents(calendar);
                } else {
                    alert('제목을 입력해주세요.');
                    // 모달 창은 닫지 않습니다.
                }
            }

            function deleteEventListener() {
                if (confirm('이 이벤트를 삭제하시겠습니까?')) {
                    info.event.remove();
                    bootstrap.Modal.getInstance(eventModalEl).hide();
                    saveEvents(calendar);
                }
            }

            // 새로운 이벤트 리스너 추가 및 참조 저장
            saveButton.addEventListener('click', saveEventListener);
            saveButton._listener = saveEventListener; // 리스너 참조 저장

            deleteButton.addEventListener('click', deleteEventListener);
            deleteButton._listener = deleteEventListener; // 리스너 참조 저장

            // 모달 창이 표시된 후 실행
            eventModalEl.addEventListener('shown.bs.modal', function () {
                var eventTitleInput = document.getElementById('event-title');
                eventTitleInput.focus();
                eventTitleInput.select();

                // 엔터 키 이벤트 리스너 관리
                eventTitleInput.removeEventListener('keypress', eventTitleInput._listener);

                function handleEnterPress(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        saveButton.click();
                    }
                }

                eventTitleInput.addEventListener('keypress', handleEnterPress);
                eventTitleInput._listener = handleEnterPress; // 리스너 참조 저장
            }, { once: true });

            // 모달 창 표시
            eventModal.show();

            // 이벤트 정보 설정
            document.getElementById('event-title').value = info.event.title;
            document.getElementById('event-content').value = info.event.extendedProps.content || '';
            document.getElementById('event-tags').value = info.event.extendedProps.tags ? info.event.extendedProps.tags.join(', ') : '';
            var currentColor = info.event.backgroundColor || '#3788D8';
            document.getElementById('event-color').value = currentColor;

            // 현재 선택된 색상 옵션 설정
            var colorOptions = document.querySelectorAll('.color-option');
            colorOptions.forEach(function(option) {
                option.classList.remove('selected');
                if (option.dataset.color === currentColor) {
                    option.classList.add('selected');
                }
            });
        },
        eventDrop: function(info) {
            var isCopy = confirm("이 이벤트를 복제하시겠습니까? '확인'을 누르면 복제, '취소'를 누르면 이동합니다.");

            if (isCopy) {
                var copiedEvent = {
                    ...info.event.extendedProps,
                    id: Date.now(),
                    title: info.event.title,
                    start: info.event.start,
                    end: info.event.end,
                    allDay: info.event.allDay,
                    backgroundColor: info.event.backgroundColor,
                    borderColor: info.event.borderColor,
                };
                calendar.addEvent(copiedEvent);
                info.revert();
            }
            saveEvents(calendar);
        },
        datesSet: function(info) {
            createDropdown(); // Ensure dropdown is created or updated as necessary

            var actionsDropdown = document.querySelector('.fc-actions-dropdown');
            if (actionsDropdown && actionsDropdown.querySelector('.dropdown-toggle')) {
                // 주간 뷰가 아닌 경우 (연간 뷰 포함)
                if (info.view.type !== 'timeGridWeek') {
                    actionsDropdown.classList.add('fc-state-disabled');
                    actionsDropdown.querySelector('.dropdown-toggle').disabled = true;
                } else {
                    actionsDropdown.classList.remove('fc-state-disabled');
                    actionsDropdown.querySelector('.dropdown-toggle').disabled = false;
                }
            }

            // 'prev', 'next' 버튼 제어
            var prevButton = document.querySelector('.fc-prev-button');
            var nextButton = document.querySelector('.fc-next-button');

            if (info.view.type === 'schoolYear') {
                if (prevButton) {
                    prevButton.classList.add('fc-state-disabled');
                    prevButton.disabled = true;
                }
                if (nextButton) {
                    nextButton.classList.add('fc-state-disabled');
                    nextButton.disabled = true;
                }
            } else {
                if (prevButton) {
                    prevButton.classList.remove('fc-state-disabled');
                    prevButton.disabled = false;
                }
                if (nextButton) {
                    nextButton.classList.remove('fc-state-disabled');
                    nextButton.disabled = false;
                }
            }

            // 타이틀 관리
            var titleEl = document.querySelector('.fc-toolbar-title');
            if (titleEl) {
                if (info.view.type === 'schoolYear') {
                    var startYear = info.start.getFullYear();
                    titleEl.textContent = startYear + '학년도';
                } else {
                    // 다른 뷰에서는 FullCalendar에서 제공하는 기본 타이틀 사용
                    titleEl.textContent = info.view.title;
                }
            }
        },
    });

    loadEvents(calendar);
    calendar.render();

    // 초기 화면 크기에 따라 버튼 표시 여부 결정
    calendar.trigger('windowResize');

    // 캘린더 렌더링 후 드롭다운 생성
    createDropdown();

    // '작업' 버튼을 드롭다운으로 변환
    function createDropdown() {
        // 기존 드롭다운이 있는지 확인
        var existingDropdown = document.querySelector('.fc-actions-dropdown');
        if (existingDropdown) {
            existingDropdown.parentNode.removeChild(existingDropdown);
        }

        // 기본 'actions' 버튼 제거
        var actionsButtons = document.querySelectorAll('.fc-actions-button');
        actionsButtons.forEach(function(button) {
            button.parentNode.removeChild(button);
        });

        var headerToolbar = document.querySelector('.fc-header-toolbar .fc-toolbar-chunk:nth-child(1)');
        if (!headerToolbar) {
            setTimeout(createDropdown, 100);
            return;
        }

        var insertPosition = headerToolbar.querySelector('.fc-schoolYear-button') ? headerToolbar.querySelector('.fc-schoolYear-button').nextSibling : headerToolbar.firstChild;

        // 드롭다운 Div 생성
        var dropdownDiv = document.createElement('div');
        dropdownDiv.className = 'dropdown d-inline-block fc-actions-dropdown';

        // 드롭다운 토글 버튼 생성
        var dropdownToggle = document.createElement('button');
        dropdownToggle.className = 'fc-button fc-button-primary dropdown-toggle no-caret'; // FullCalendar 스타일 유지, 드롭다운 활성화
        dropdownToggle.type = 'button';
        dropdownToggle.setAttribute('data-bs-toggle', 'dropdown');
        dropdownToggle.setAttribute('aria-expanded', 'false');
        dropdownToggle.innerHTML = '<i class="fa fa-cog"></i>'; // 기어 아이콘으로 변경

        // 드롭다운 메뉴 생성
        var dropdownMenu = document.createElement('ul');
        dropdownMenu.className = 'dropdown-menu';

        // '지난 주 복사' 메뉴 아이템 생성
        var copyPrevWeekItem = document.createElement('li');
        var copyPrevWeekLink = document.createElement('a');
        copyPrevWeekLink.className = 'dropdown-item';
        copyPrevWeekLink.href = '#';
        copyPrevWeekLink.innerText = '지난 주 복사';
        copyPrevWeekLink.addEventListener('click', function(e) {
            e.preventDefault();
            copyPrevWeek();
        });
        copyPrevWeekItem.appendChild(copyPrevWeekLink);

        // '이번 주 삭제' 메뉴 아이템 생성
        var deleteCurrentWeekItem = document.createElement('li');
        var deleteCurrentWeekLink = document.createElement('a');
        deleteCurrentWeekLink.className = 'dropdown-item';
        deleteCurrentWeekLink.href = '#';
        deleteCurrentWeekLink.innerText = '이번 주 삭제';
        deleteCurrentWeekLink.addEventListener('click', function(e) {
            e.preventDefault();
            deleteCurrentWeek();
        });
        deleteCurrentWeekItem.appendChild(deleteCurrentWeekLink);

        // 메뉴 아이템 추가
        dropdownMenu.appendChild(copyPrevWeekItem);
        dropdownMenu.appendChild(deleteCurrentWeekItem);

        // 요소 조립
        dropdownDiv.appendChild(dropdownToggle);
        dropdownDiv.appendChild(dropdownMenu);

        // 드롭다운을 헤더 툴바에 삽입
        headerToolbar.insertBefore(dropdownDiv, insertPosition);
    }

    // '지난 주 복사' 기능
    function copyPrevWeek() {
        if (confirm('이전 주의 이벤트를 현재 주로 복사하시겠습니까?')) {
            var view = calendar.view;
            var currentStart = view.currentStart;
            var currentEnd = view.currentEnd;

            // 이전 주의 시작 및 종료 날짜 계산
            var prevStart = new Date(currentStart);
            prevStart.setDate(prevStart.getDate() - 7);

            var prevEnd = new Date(currentEnd);
            prevEnd.setDate(prevEnd.getDate() - 7);

            // 모든 이벤트 가져오기
            var events = calendar.getEvents();

            // 이전 주의 이벤트 필터링
            var prevWeekEvents = events.filter(function(event) {
                return event.start >= prevStart && event.start < prevEnd;
            });

            // 이전 주 이벤트 복제 및 날짜 조정
            prevWeekEvents.forEach(function(event) {
                var newStart = new Date(event.start.getTime() + 7 * 24 * 60 * 60 * 1000);
                var newEnd = event.end ? new Date(event.end.getTime() + 7 * 24 * 60 * 60 * 1000) : null;

                var newEvent = {
                    id: Date.now() + Math.random(),
                    title: event.title,
                    start: newStart,
                    end: newEnd,
                    allDay: event.allDay,
                    backgroundColor: event.backgroundColor,
                    borderColor: event.borderColor,
                    extendedProps: event.extendedProps,
                };

                calendar.addEvent(newEvent);
            });

            // 이벤트 저장
            saveEvents(calendar);

            // 완료 메시지 표시
            alert('이전 주의 이벤트가 현재 주로 복사되었습니다.');
        }
    }

    // '이번 주 삭제' 기능
    function deleteCurrentWeek() {
        if (confirm('현재 주의 모든 이벤트를 삭제하시겠습니까?')) {
            var view = calendar.view;
            var currentStart = view.currentStart;
            var currentEnd = view.currentEnd;

            // 모든 이벤트 가져오기
            var events = calendar.getEvents();

            // 현재 주의 이벤트 필터링
            var currentWeekEvents = events.filter(function(event) {
                return event.start >= currentStart && event.start < currentEnd;
            });

            // 현재 주의 이벤트 삭제
            currentWeekEvents.forEach(function(event) {
                event.remove();
            });

            // 이벤트 저장
            saveEvents(calendar);

            // 완료 메시지 표시
            alert('현재 주의 모든 이벤트가 삭제되었습니다.');
        }
    }
});