let tasks = [];
let currentTaskIndex = null;
let completedTasks = {};

// Request notification permission
document.addEventListener('DOMContentLoaded', () => {
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
});        

function addTask() {
    const taskName = document.getElementById('taskName').value;
    const taskTag = document.getElementById('taskTag').value;

    if (taskName.trim() === "" && taskTag !== "[Rest]") {
        alert("You can only add an empty task with the [Rest] tag!");
        return;
    }

    const task = {
        name: taskName || "(Rest)",
        tag: taskTag,
        startTime: null,
        endTime: null,
        scheduledTime: null,
        alerted: false // Initialize alerted to false
    };

    tasks.push(task);
    document.getElementById('taskName').value = "";
    renderTasks();
}

function startTask(index) {
    if (currentTaskIndex !== null) {
        alert("You are already working on a task!");
        return;
    }

    const now = new Date();
    tasks[index].startTime = now;
    currentTaskIndex = index;
    renderTasks();
}

function endTask(index) {
    if (currentTaskIndex === null || currentTaskIndex !== index) {
        alert("You have not started this task!");
        return;
    }

    const now = new Date();
    tasks[index].endTime = now;
    currentTaskIndex = null;

    renderTasks();

    setTimeout(() => {
        moveTaskToFooter(index);
        tasks[index].startTime = null;
        tasks[index].endTime = null;
        renderTasks();
    }, 1000);
}

function moveTaskToFooter(index) {
    const task = tasks[index];
    const recordDate = new Date().toISOString().split('T')[0].replace(/-/g, '/');

    if (!completedTasks[recordDate]) {
        completedTasks[recordDate] = [];
    }

    const record = `${formatTime(task.startTime)} ~ ${formatTime(task.endTime)} | ${task.name} ${task.tag}`;
    completedTasks[recordDate] = insertInChronologicalOrder(completedTasks[recordDate], record);
    updateFooter();
}

function renderTasks() {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = "";

    tasks.forEach((task, index) => {
        const taskElement = document.createElement('div');
        taskElement.classList.add('task');

        let taskText = task.startTime ?
            `${formatTime(task.startTime)} ~ ${task.endTime ? formatTime(task.endTime) : "??:??"} | ${task.name} ${task.tag}` :
            `${task.name} ${task.tag} (Not Started)`;

        taskElement.innerHTML = `
            <span>${taskText}</span>
            <div>
                <input type="datetime-local" class="schedule-input" id="schedule-${index}">
                <button class="btn btn-warning btn-sm" onclick="scheduleTask(${index})">Schedule</button>
                <button class="btn btn-success btn-sm" onclick="startTask(${index})">Start</button>
                <button class="btn btn-danger btn-sm" onclick="endTask(${index})">End</button>
            </div>
        `;

        taskList.appendChild(taskElement);
    });
}

function formatTime(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function updateFooter() {
    const footer = document.getElementById('footerLog');
    footer.innerHTML = "";

    Object.keys(completedTasks).forEach(date => {
        const dateHeader = document.createElement('div');
        dateHeader.classList.add('date-header');
        dateHeader.innerText = `# ${date}`;
        footer.appendChild(dateHeader);

        completedTasks[date].forEach(record => {
            const recordElement = document.createElement('div');
            recordElement.innerText = record;
            footer.appendChild(recordElement);
        });
    });
}

function downloadTasks() {
    let text = "";

    Object.keys(completedTasks).forEach(date => {
        text += `# ${date}\n`;
        completedTasks[date].forEach(record => {
            text += `${record}\n`;
        });
    });

    const now = new Date();
    const filename = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}_Record.txt`;

    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function clearTasks() {
    tasks = [];
    completedTasks = {};
    renderTasks();
    updateFooter();
}

function importTasks(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const contents = e.target.result;
        const lines = contents.split('\n');
        let currentDate = '';

        lines.forEach(line => {
            if (line.startsWith('#')) {
                currentDate = line.slice(2);
                if (!completedTasks[currentDate]) {
                    completedTasks[currentDate] = [];
                }
            } else if (line.trim()) {
                completedTasks[currentDate] = insertInChronologicalOrder(completedTasks[currentDate], line.trim());

                const taskMatch = line.match(/\| (.*?) (\[.*?\])$/);
                if (taskMatch) {
                    const [, taskName, taskTag] = taskMatch;

                    if (!tasks.some(task => task.name === taskName && task.tag === taskTag)) {
                        tasks.push({
                            name: taskName,
                            tag: taskTag,
                            startTime: null,
                            endTime: null
                        });
                    }
                }
            }
        });

        updateFooter();
        renderTasks();
    };

    reader.readAsText(file);
}

function insertInChronologicalOrder(records, newRecord) {
    const [newStartTime] = newRecord.split(' ~ ');
    for (let i = 0; i < records.length; i++) {
        const [existingStartTime] = records[i].split(' ~ ');
        if (newStartTime < existingStartTime) {
            records.splice(i, 0, newRecord);
            return records;
        }
    }
    records.push(newRecord);
    return records;
}

function scheduleTask(index) {
    const scheduleInput = document.getElementById(`schedule-${index}`).value;
    if (!scheduleInput) {
        alert('Please select a valid date and time!');
        return;
    }

    const [datePart, timePart] = scheduleInput.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);

    const scheduleTime = new Date(year, month - 1, day, hour, minute);

    if (isNaN(scheduleTime.getTime())) {
        alert('Please select a valid date and time!');
        return;
    }

    tasks[index].scheduledTime = scheduleTime;
    tasks[index].alerted = false; // Initialize alerted to false

    alert(`Task "${tasks[index].name}" scheduled for ${scheduleTime.toLocaleString()}`);
}

// Periodically check for scheduled tasks
// Adjust the setInterval frequency
setInterval(() => {
    const now = new Date();

    tasks.forEach((task, index) => {
        if (task.scheduledTime && !task.alerted) {
            const timeDiff = task.scheduledTime - now;
            const minutesDiff = Math.floor(timeDiff / 60000);

            if (minutesDiff <= 10 && minutesDiff >= -10) {
                if (Notification.permission === 'default' || Notification.permission === 'granted') {
                    new Notification(`Reminder: ${task.name} is scheduled at ${formatTime(task.scheduledTime)}!`, {requireInteraction: true});
                    task.alerted = true; // Only set alerted to true after successfully sending the notification
                }                        
            }
        }
    });
}, 1000); // Check every 1 second

function toggleTheme() {
    const body = document.body;
    const themeIcon = document.querySelector('.theme-icon i');

    if (body.classList.contains('bg-light')) {
        body.classList.replace('bg-light', 'bg-dark');
        themeIcon.classList.replace('fa-sun', 'fa-moon');
    } else {
        body.classList.replace('bg-dark', 'bg-light');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }
}
