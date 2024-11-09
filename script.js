let config = null;
let currentMode = 'auto';
let isInternalChecked = false;  // 标记是否已完成检测
let isInternalResult = false;   // 存储检测结果

async function loadConfig() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error('加载配置文件失败');
        }
        config = await response.json();
        
        currentMode = config.mode;
        document.getElementById('siteTitle').textContent = config.title;
        updateModeButtons();
        await renderServices();
    } catch (error) {
        console.error('加载配置失败:', error);
        document.getElementById('statusText').textContent = '配置加载失败';
        document.getElementById('statusText').style.backgroundColor = '#ffebee';
        document.getElementById('statusText').style.color = '#c62828';
    }
}

async function isInternalNetwork() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);

        const response = await fetch(config.services[0].internalUrl, {
            mode: 'no-cors',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return true;
    } catch {
        return false;
    }
}
function updateModeButtons() {
    ['auto', 'internal', 'external'].forEach(mode => {
        const button = document.getElementById(`${mode}Mode`);
        if (button) {
            button.classList.toggle('active', currentMode === mode);
        }
    });
}

async function switchMode(mode) {
    currentMode = mode;
    updateModeButtons();
    
    if (mode === 'auto' && !isInternalChecked) {
        // 如果切换到自动模式且未完成检测，立即开始检测
        document.getElementById('statusText').textContent = '正在检测网络环境...';
        isInternalResult = await checkInternalNetwork();
        isInternalChecked = true;
        updateNetworkStatus(isInternalResult);
    }
    
    await renderServices();
}

async function renderServices() {
    if (!config) {
        console.error('配置未加载');
        return;
    }
    
    const servicesDiv = document.getElementById('services');
    servicesDiv.innerHTML = '';
    
    // 如果是自动模式且还未完成检测，先使用外网模式渲染
    let isInternal = false;
    if (currentMode === 'auto') {
        isInternal = isInternalChecked ? isInternalResult : false;
    } else {
        isInternal = currentMode === 'internal';
    }

    // 渲染服务列表
    config.services.forEach(service => {
        const url = isInternal ? service.internalUrl : service.externalUrl;
        if (!url || url === '') return;

        const card = document.createElement('div');
        card.className = 'service-card';
        
        card.innerHTML = `
            <a href="${url}" target="_blank">
                <img src="${service.icon}" alt="${service.name}" 
                     onerror="this.src='/images/default.png'">
                <h3>${service.name}</h3>
                ${service.showDesc && service.desc ? `<p>${service.desc}</p>` : ''}
            </a>
        `;
        servicesDiv.appendChild(card);
    });
}

function updateNetworkStatus(isInternal) {
    const statusText = document.getElementById('statusText');
    if (statusText) {
        statusText.textContent = isInternal ? '当前为内网环境' : '当前为外网环境';
        statusText.style.backgroundColor = isInternal ? '#e8f5e9' : '#fff3e0';
        statusText.style.color = isInternal ? '#2e7d32' : '#e65100';
    }
}

// 异步检测内网环境
async function checkInternalNetwork() {
    try {
        const testService = config.services.find(service => service.internalUrl);
        if (!testService) {
            return false;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2秒超时

        const response = await fetch(testService.internalUrl, {
            mode: 'no-cors',
            cache: 'no-cache',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return true;
    } catch (error) {
        console.log('内网检测失败，判定为外网环境');
        return false;
    }
}

// 初始化函数
async function init() {
    try {
        // 加载配置
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error('加载配置文件失败');
        }
        config = await response.json();
        
        // 设置标题
        document.getElementById('siteTitle').textContent = config.title;
        
        // 设置初始模式
        currentMode = config.mode || 'auto';
        
        // 先渲染页面（使用外网模式）
        updateModeButtons();
        await renderServices();

        // 异步检测内网环境
        if (currentMode === 'auto') {
            document.getElementById('statusText').textContent = '正在检测网络环境...';
            
            // 在后台进行内网检测
            isInternalResult = await checkInternalNetwork();
            isInternalChecked = true;
            
            // 检测完成后更新UI
            updateNetworkStatus(isInternalResult);
            await renderServices();
        }
    } catch (error) {
        console.error('初始化失败:', error);
        document.getElementById('statusText').textContent = '配置加载失败';
        document.getElementById('statusText').style.backgroundColor = '#ffebee';
        document.getElementById('statusText').style.color = '#c62828';
    }
}

window.addEventListener('load', init); 

