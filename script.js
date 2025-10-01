/*
 * @Author: 徐佳德 1404577549@qq.com
 * @Date: 2025-08-07 10:29:19
 * @LastEditors: 徐佳德 1404577549@qq.com
 * @LastEditTime: 2025-08-25 12:00:58
 * @FilePath: \图像类插件\script.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

// 获取CEP接口
var csInterface = new CSInterface();
var __composePreviewCache = new Map();
// 嵌套文件夹数据存储
var nestedFolderData = {
    isCollected: false,    // 是否已收集数据
    layerMapping: null,    // 图层名称到图片路径的映射
    folderPath: '',        // 文件夹路径
    totalImages: 0,        // 总图片数量
    info: []              // 详细信息
};
// ES3兼容的图层映射字符串解析函数
function parseLayerMappingString(str) {
    try {
        // 简单的JSON解析（ES3兼容）
        if (typeof str !== 'string' || str.trim() === '') {
            return {};
        }
        
        // 移除首尾的大括号
        str = str.trim();
        if (str.charAt(0) === '{' && str.charAt(str.length - 1) === '}') {
            str = str.substring(1, str.length - 1);
        }
        
        var result = {};
        var pairs = str.split(',');
        
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].trim();
            if (pair === '') continue;
            
            // 查找第一个冒号
            var colonIndex = pair.indexOf(':');
            if (colonIndex === -1) continue;
            
            // 提取键和值
            var key = pair.substring(0, colonIndex).trim();
            var value = pair.substring(colonIndex + 1).trim();
            
            // 移除引号
            if (key.charAt(0) === '"' && key.charAt(key.length - 1) === '"') {
                key = key.substring(1, key.length - 1);
            }
            if (value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
                value = value.substring(1, value.length - 1);
            }
            
            // 处理转义字符
            key = key.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            value = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            
            result[key] = value;
        }
        
        return result;
    } catch (error) {
        console.error('解析图层映射字符串失败:', error);
        return {};
    }
}
// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 获取选择文件夹按钮
    var selectFolderBtn = document.getElementById('selectFolderBtn');
    var imagePathInput = document.getElementById('imagePathInput');
    var editAndContinueBtn = document.getElementById('editAndContinueBtn');
    var collectNestedBtn = document.getElementById('collectNestedBtn');
    // var convertToSmartBtn = document.getElementById('convertToSmartBtn');

    
    var txtUploadInput = document.getElementById('txtUploadInput');
    var uploadTxtBtn = document.getElementById('uploadTxtBtn');
    
    
    // 选择文件夹按钮事件
    selectFolderBtn.addEventListener('click', function() {
        
        // 创建文件夹选择对话框
        var folderInput = document.createElement('input');
        folderInput.type = 'file';
        folderInput.webkitdirectory = true;
        folderInput.style.display = 'none';
        
        folderInput.addEventListener('change', function(e) {
            var files = Array.from(e.target.files);
            if (files.length > 0) {
                // 获取用户选择的文件夹路径
                var firstFilePath = files[0].path;
                // 找到用户选择的文件夹路径（去掉文件名和可能的子文件夹）
                var pathParts = firstFilePath.split(/[\\\/]/);
                // 移除文件名（最后一部分）
                pathParts.pop();
                
                // 如果路径中包含子文件夹，我们需要找到用户实际选择的文件夹
                // 通过检查webkitRelativePath来确定用户选择的文件夹层级
                var relativePath = files[0].webkitRelativePath;
                if (relativePath) {
                    var relativeParts = relativePath.split(/[\\\/]/);
                    // 用户选择的文件夹是相对路径的第一部分
                    var selectedFolderName = relativeParts[0];
                    
                    // 找到用户选择的文件夹在完整路径中的位置
                    var selectedFolderIndex = -1;
                    for (var i = 0; i < pathParts.length; i++) {
                        if (pathParts[i] === selectedFolderName) {
                            selectedFolderIndex = i;
                            break;
                        }
                    }
                    
                    if (selectedFolderIndex !== -1) {
                        // 只取到用户选择的文件夹
                        pathParts = pathParts.slice(0, selectedFolderIndex + 1);
                    }
                }
                
                var folderPath = pathParts.join('\\');
                imagePathInput.value = folderPath;
                showMessage('已选择文件夹: ' + folderPath, 'success');
                
                // 过滤并显示图片文件
                displayImagePreview(files);
            }
        });
        
        // 触发文件夹选择
        document.body.appendChild(folderInput);
        folderInput.click();
        document.body.removeChild(folderInput);
    });
    
    editAndContinueBtn.addEventListener('click', function() {
        
        // 获取用户输入的图片路径
        var imagePath = imagePathInput.value.trim();
        
        if (imagePath === '') {
            showMessage('请输入图片文件夹路径或点击"选择文件夹"按钮', 'warning');
            return;
        }
        
        // 调用ExtendScript函数，传入图层组名称和图片路径
        csInterface.evalScript('getLayerSets("组 1", "' + imagePath.replace(/\\/g, '\\\\') + '")', function(result) {
            console.log('ExtendScript执行结果:', result);
            
            if (result.startsWith('found:')) {
                alert(result);
                showMessage('找到图层组: ' + result.substring(6), 'success');
            } else if (result === 'not_found') {
                showMessage('未找到名为"组 1"的图层组', 'error');
            } else if (result === 'no_document') {
                showMessage('没有打开的文档', 'error');
            } else if (result === 'folder_not_exists') {
                showMessage('图片文件夹不存在，请检查路径', 'error');
            } else if (result === 'no_images_found') {
                showMessage('在指定文件夹中未找到图片文件', 'error');
            } else {
                showMessage('操作失败: ' + result, 'error');
            }
        });
    });
    
    // 收集嵌套文件夹图片按钮事件
    collectNestedBtn.addEventListener('click', function() {
        // 创建文件夹选择对话框
        var folderInput = document.createElement('input');
        folderInput.type = 'file';
        folderInput.webkitdirectory = true;
        folderInput.style.display = 'none';
        
        folderInput.addEventListener('change', function(e) {
            var files = Array.from(e.target.files);
            if (files.length > 0) {
                // 获取用户选择的文件夹路径
                var firstFilePath = files[0].path;
                // 找到用户选择的文件夹路径（去掉文件名和可能的子文件夹）
                var pathParts = firstFilePath.split(/[\\\/]/);
                // 移除文件名（最后一部分）
                pathParts.pop();
                
                // 如果路径中包含子文件夹，我们需要找到用户实际选择的文件夹
                // 通过检查webkitRelativePath来确定用户选择的文件夹层级
                var relativePath = files[0].webkitRelativePath;
                if (relativePath) {
                    var relativeParts = relativePath.split(/[\\\/]/);
                    // 用户选择的文件夹是相对路径的第一部分
                    var selectedFolderName = relativeParts[0];
                    
                    // 找到用户选择的文件夹在完整路径中的位置
                    var selectedFolderIndex = -1;
                    for (var i = 0; i < pathParts.length; i++) {
                        if (pathParts[i] === selectedFolderName) {
                            selectedFolderIndex = i;
                            break;
                        }
                    }
                    
                    if (selectedFolderIndex !== -1) {
                        // 只取到用户选择的文件夹
                        pathParts = pathParts.slice(0, selectedFolderIndex + 1);
                    }
                }
                
                var parentFolderPath = pathParts.join('\\');
                
                // 验证路径是否存在
                if (!parentFolderPath || parentFolderPath.length === 0) {
                    showMessage('请选择有效的文件夹路径', 'warning');
                    return;
                }
                
                // 更新输入框中的路径
                imagePathInput.value = parentFolderPath;
                
                showMessage('正在收集嵌套文件夹图片...', 'info');
                
                // 调用ExtendScript函数收集嵌套文件夹图片
                csInterface.evalScript('collectNestedImagePaths("' + parentFolderPath.replace(/\\/g, '\\\\') + '")', function(result) {
                    try {
                        // 检查返回结果类型
                        var layerMapping;
                        
                        // 直接返回的是layerMapping对象
                        layerMapping = parseLayerMappingString(result);
                        
                        // 保存数据到全局变量
                        nestedFolderData.isCollected = true;
                        nestedFolderData.layerMapping = layerMapping;
                        nestedFolderData.folderPath = parentFolderPath;
                        
                        // 安全地计算图层映射数量
                        var layerMappingCount = 0;
                        
                        if (layerMapping !== null) {
                            try {
                                layerMappingCount = Object.keys(layerMapping).length;
                            } catch (error) {
                                layerMappingCount = 0;
                            }
                        } else {
                            alert('layerMapping不是有效对象');
                        }
                        
                        nestedFolderData.totalImages = layerMappingCount;
                        
                        
                        // 显示结果预览
                        displayNestedFolderPreview(layerMapping);
                    } catch (error) {                    
                        var errorMsg = '处理结果时发生错误:\n' +
                                      '错误信息: ' + error.message + '\n' +
                                      '原始结果: ' + result + '\n' +
                                      '行数: 前端处理阶段';
                        console.error(errorMsg);
                        showMessage('处理结果时发生错误: ' + error.message, 'error');
                    }
                });
            }
        });
        
        // 触发文件夹选择
        document.body.appendChild(folderInput);
        folderInput.click();
        document.body.removeChild(folderInput);
    });
    




    // 新-嵌套文件夹渲染按钮事件
    var renderNestedNewBtn = document.getElementById('renderNestedNewBtn');
    if (renderNestedNewBtn) {
        renderNestedNewBtn.addEventListener('click', function() {
            console.log('点击了新-嵌套文件夹渲染按钮');
            
            // 检查是否有图层映射数据
            if (!nestedFolderData.isCollected || !nestedFolderData.layerMapping) {
                showMessage('请先点击"收集嵌套文件夹图片"按钮收集数据', 'warning');
                return;
            }
            
            // 获取目标图层组名称
            var groupName = '组 1';
            
            if (!groupName) {
                showMessage('操作取消', 'info');
                return;
            }
            
            showMessage('开始新的嵌套文件夹渲染...', 'info');
            
            // 调用ExtendScript函数，执行新的嵌套文件夹渲染
            csInterface.evalScript('renderNestedFolderImagesNew(\'' + JSON.stringify(nestedFolderData.layerMapping) + '\')', function(result) {
                console.log('新嵌套文件夹渲染执行结果:', result);
                
                if (result.startsWith('success:')) {
                    showMessage(result, 'success');
                } else if (result === 'no_document') {
                    showMessage('没有打开的文档', 'error');
                } else if (result.startsWith('group_not_found:')) {
                    showMessage('找不到图层组: ' + result.split(':')[1], 'error');
                } else if (result.startsWith('error:')) {
                    showMessage(result, 'error');
                } else {
                    showMessage('操作失败: ' + result, 'error');
                }
            });
        });
    }
    
    // 一键智能图层按钮事件
    /*
    convertToSmartBtn.addEventListener('click', function() {
        console.log('点击了一键智能图层按钮');
        
        // 调用ExtendScript函数，将"组 1"图层组内的所有图层转换为智能图层
        csInterface.evalScript('convertToSmartObjects()', function(result) {
            console.log('一键智能图层执行结果:', result);
            
            if (result.startsWith('success:')) {
                showMessage(result, 'success');
            } else if (result === 'no_document') {
                showMessage('没有打开的文档', 'error');
            } else if (result.startsWith('group_not_found:')) {
                showMessage(result, 'error');
            } else if (result.startsWith('no_layers_in_group:')) {
                showMessage(result, 'warning');
            } else if (result.startsWith('no_conversion:')) {
                showMessage(result, 'info');
            } else {
                showMessage('操作失败: ' + result, 'error');
            }
        });
    });
    */

    // 一键重命名图层按钮事件
    
    var renameLayersBtn = document.getElementById('renameLayersBtn');
    if (renameLayersBtn) {
        renameLayersBtn.addEventListener('click', function() {
            console.log('点击了一键重命名图层按钮');
            
            // 调用ExtendScript函数，将"组 1"图层组内的所有图层重命名
            csInterface.evalScript('renameLayersInGroup()', function(result) {
                console.log('一键重命名图层执行结果:', result);
                
                if (result.startsWith('success:')) {
                    showMessage(result, 'success');
                } else if (result === 'no_document') {
                    showMessage('没有打开的文档', 'error');
                } else if (result.startsWith('group_not_found:')) {
                    showMessage(result, 'error');
                } else if (result.startsWith('no_layers_in_group:')) {
                    showMessage(result, 'warning');
                } else if (result.startsWith('no_rename:')) {
                    showMessage(result, 'info');
                } else {
                    showMessage('操作失败: ' + result, 'error');
                }
            });
        });
    }
    





    // TXT上传并渲染合成预览
    if (uploadTxtBtn && txtUploadInput) {
        uploadTxtBtn.addEventListener('click', function() {
            txtUploadInput.click();
        });
    }

    if (txtUploadInput) {
        txtUploadInput.addEventListener('change', function(e) {
            var file = e.target.files && e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                var text = String(ev.target.result || '');
                handleComposePreview(text);
            };
            reader.onerror = function() { showMessage('读取TXT失败', 'error'); };
            reader.readAsText(file, 'utf-8');
        });
    }
});
// 显示消息提示
function showMessage(message, type) {
    // 创建消息元素
    var messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + type;
    messageDiv.textContent = message;
    
    // 添加到页面
    document.body.appendChild(messageDiv);
    
    // 3秒后自动移除
    setTimeout(function() {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

// 显示图片预览
function displayImagePreview(files) {
    var container = document.getElementById('imagePreviewContainer');
    var imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.tif'];
    
    // 清空容器
    container.innerHTML = '';
    
    // 过滤图片文件
    var imageFiles = files.filter(function(file) {
        var fileName = file.name.toLowerCase();
        return imageExtensions.some(function(ext) {
            return fileName.endsWith(ext);
        });
    });
    
    // 按文件名排序（改进的自然排序算法）
    imageFiles.sort(function(a, b) {
        var nameA = a.name;
        var nameB = b.name;
        
        // 检查是否包含"中包序号"
        var aHasZhongBao = nameA.indexOf("中包序号") !== -1;
        var bHasZhongBao = nameB.indexOf("中包序号") !== -1;
        
        // 如果一个包含"中包序号"而另一个不包含，包含的排到后面
        if (aHasZhongBao && !bHasZhongBao) {
            return 1;
        }
        if (!aHasZhongBao && bHasZhongBao) {
            return -1;
        }
        
        // 自然排序函数
        function naturalSort(a, b) {
            var ax = [], bx = [];
            
            a.replace(/(\d+)|(\D+)/g, function(_, $1, $2) {
                ax.push([$1 || Infinity, $2 || ""]);
            });
            b.replace(/(\d+)|(\D+)/g, function(_, $1, $2) {
                bx.push([$1 || Infinity, $2 || ""]);
            });
            
            while (ax.length && bx.length) {
                var an = ax.shift();
                var bn = bx.shift();
                var nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
                if (nn) return nn;
            }
            
            return ax.length - bx.length;
        }
        
        return naturalSort(nameA, nameB);
    });
    
    if (imageFiles.length === 0) {
        container.innerHTML = '<div class="no-images-message">未找到图片文件</div>';
        return;
    }
    
    // 创建图片预览
    imageFiles.forEach(function(file, index) {
        var imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        
        var image = document.createElement('img');
        image.className = 'preview-image';
        image.alt = file.name;
        
        // 添加点击事件，实现放大查看
        image.addEventListener('click', function() {
            if (this.dataset.imageData) {
                showImageModal(this.dataset.imageData, file.name);
            } else {
                showMessage('图片加载中，请稍后再试', 'warning');
            }
        });
        
        // 创建文件信息
        var fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.innerHTML = '<span class="file-name">' + file.name + '</span><span class="file-index">#' + (index + 1) + '</span>';
        
        // 使用FileReader读取图片
        var reader = new FileReader();
        reader.onload = function(e) {
            image.src = e.target.result;
            // 设置图片数据到dataset，用于点击放大
            image.dataset.imageData = e.target.result;
        };
        reader.readAsDataURL(file);
        
        imageItem.appendChild(image);
        imageItem.appendChild(fileInfo);
        container.appendChild(imageItem);
    });
    
    // 显示图片数量信息
    var countInfo = document.createElement('div');
    countInfo.className = 'image-count';
    countInfo.textContent = '共找到 ' + imageFiles.length + ' 张图片';
    container.appendChild(countInfo);
}

// 解析并渲染右侧“合成预览”
function handleComposePreview(txtContent) {
    var container = document.getElementById('composePreviewContainer');
    var meta = document.getElementById('txtMeta');
    if (!container) return;

    var parsed = parseBatchAndUrlsForCompose(txtContent);
    if (!parsed || !parsed.urls.length) {
        container.innerHTML = '';
        if (meta) meta.textContent = '未解析到“合成预览”链接';
        showMessage('TXT中未解析到"合成预览"链接', 'warning');
        return;
    }



    if (meta) meta.textContent = '批次: ' + (parsed.batchNo || '-') + ' | 导出时间: ' + (parsed.exportTime || '-') + ' | 合成图: ' + parsed.urls.length;

    var cacheKey = parsed.batchKey;
    var cached = __composePreviewCache.get(cacheKey);
    if (cached && Array.isArray(cached)) {
        renderComposeListWithCustomText(container, cached, parsed.items);
        return;
    }

    preloadComposeImages(parsed.urls).then(function(items) {
        __composePreviewCache.set(cacheKey, items);
        renderComposeListWithCustomText(container, items, parsed.items);
    }).catch(function() {
        var fallbackItems = parsed.urls.map(function(u, index) { 
            return { 
                url: u, 
                dataURL: null,
                customText: parsed.items[index] ? parsed.items[index].customText : '合成预览'
            }; 
        });
        renderComposeListWithCustomText(container, fallbackItems, parsed.items);
    });
}
// 解析合成预览文本
function parseBatchAndUrlsForCompose(text) {
    try {
        var batchMatch = text.match(/^[\t ]*批次号[：:][\t ]*(.+)$/m);
        var timeMatch = text.match(/^[\t ]*导出时间[：:][\t ]*(.+)$/m);
        var batchNo = batchMatch ? (batchMatch[1] || '').trim() : '';
        var exportTime = timeMatch ? (timeMatch[1] || '').trim() : '';
        var batchKey = (batchNo ? batchNo : 'unknown') + '___' + (exportTime ? exportTime : 'unknown');

        // 解析每个合成预览项，包含定制文字和URL
        var items = [];
        var lines = text.split('\n');
        var currentCustomText = '';
        
        console.log('开始解析文本，总行数:', lines.length);
        
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            
            // 检查是否是定制文字行
            var customTextMatch = line.match(/^定制文字[：:]\s*(.+)$/);
            if (customTextMatch) {
                currentCustomText = (customTextMatch[1] || '').trim();
                console.log('找到定制文字:', currentCustomText);
                continue;
            }
            
            // 检查是否是合成预览行
            var previewMatch = line.match(/^合成预览[：:]\s*(https?:\/\/\S+)$/);
            if (previewMatch) {
                var url = (previewMatch[1] || '').trim();
                if (url) {
                    var item = {
                        url: url,
                        customText: currentCustomText || '合成预览'
                    };
                    items.push(item);
                    console.log('找到合成预览:', item);
                }
            }
        }
        
        console.log('解析完成，共找到', items.length, '个项目');
        
        var urls = items.map(function(item) { return item.url; });
        
        return { 
            batchNo: batchNo, 
            exportTime: exportTime, 
            items: items,
            batchKey: batchKey, 
            urls: urls 
        };
    } catch (e) {
        return { batchNo: '', exportTime: '', items: [], batchKey: 'unknown___unknown', urls: [] };
    }
}
// 预加载合成预览图片
function preloadComposeImages(urls) {
    var limit = 6;
    var idx = 0;
    var results = new Array(urls.length);
    function next() {
        if (idx >= urls.length) return Promise.resolve();
        var i = idx++;
        var url = urls[i];
        return fetch(url, { cache: 'force-cache' }).then(function(resp) {
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            return resp.blob();
        }).then(function(blob) {
            return new Promise(function(resolve) {
                var fr = new FileReader();
                fr.onload = function() { results[i] = { url: url, dataURL: String(fr.result || '') }; resolve(); };
                fr.onerror = function() { results[i] = { url: url, dataURL: null }; resolve(); };
                fr.readAsDataURL(blob);
            });
        }).catch(function() { results[i] = { url: url, dataURL: null }; }).then(next);
    }
    var workers = [];
    for (var w = 0; w < Math.min(limit, urls.length); w++) workers.push(next());
    return Promise.all(workers).then(function() { return results; });
}
// 渲染合成预览列表
function renderComposeListWithCustomText(container, items, parsedItems) {
    container.innerHTML = '';
    items.forEach(function(it, index) {
        var imageItem = document.createElement('div');
        imageItem.className = 'image-item';

        var image = document.createElement('img');
        image.className = 'preview-image';
        image.alt = '合成预览 ' + (index + 1);
        image.src = (it.dataURL || it.url || it);
        image.addEventListener('click', function() {
            if (image.src) {
                showImageModal(image.src, '合成预览 #' + (index + 1));
            } else {
                showMessage('图片加载中，请稍后再试', 'warning');
            }
        });

        var fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        
        // 获取对应的定制文字
        var customText = '';
        if (parsedItems && parsedItems[index]) {
            customText = parsedItems[index].customText;
        } else if (it.customText) {
            customText = it.customText;
        }
        
        if (customText && customText.trim()) {
            fileInfo.innerHTML = '<span class="file-name">' + customText + '</span><span class="file-index">#' + (index + 1) + '</span>';
        } else {
            fileInfo.innerHTML = '<span class="file-name">合成预览 #' + (index + 1) + '</span><span class="file-index">#' + (index + 1) + '</span>';
        }

        // 为整个图片项添加点击复制定制文字的功能
        imageItem.addEventListener('click', function(e) {
            // 如果点击的是图片本身，不执行复制操作（避免与图片放大功能冲突）
            if (e.target === image) {
                return;
            }
            
            // 获取定制文字
            var textToCopy = '';
            if (parsedItems && parsedItems[index]) {
                textToCopy = parsedItems[index].customText;
            } else if (it.customText) {
                textToCopy = it.customText;
            }
            
            if (textToCopy && textToCopy.trim()) {
                // 复制到剪贴板
                copyToClipboard(textToCopy);
                showMessage('已复制定制文字: ' + textToCopy, 'success');
            } else {
                showMessage('该图片没有对应的定制文字', 'warning');
            }
        });

        // 添加鼠标悬停效果，提示可以点击复制
        imageItem.addEventListener('mouseenter', function() {
            if (this.querySelector('.file-name').textContent !== '合成预览 #' + (index + 1)) {
                this.style.cursor = 'pointer';
                this.style.transform = 'scale(1.02)';
                this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }
        });
        
        imageItem.addEventListener('mouseleave', function() {
            this.style.cursor = 'default';
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        });

        imageItem.appendChild(image);
        imageItem.appendChild(fileInfo);
        container.appendChild(imageItem);
    });

    var countInfo = document.createElement('div');
    countInfo.className = 'image-count';
    countInfo.textContent = '共找到 ' + items.length + ' 张图片';
    container.appendChild(countInfo);

    // 添加操作提示
    var tipDiv = document.createElement('div');
    tipDiv.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background-color: #e3f2fd;
        border: 1px solid #bbdefb;
        border-radius: 6px;
        color: #1565c0;
        font-size: 13px;
        text-align: center;
        font-weight: 500;
    `;
    tipDiv.innerHTML = '💡 <strong>操作提示：</strong>点击图片可放大查看，点击图片外的区域可复制对应的定制文字';
    container.appendChild(tipDiv);
}
// 渲染合成预览列表（左）
function renderComposeListLikeLeft(container, items, customText) {
    container.innerHTML = '';
    items.forEach(function(it, index) {
        var imageItem = document.createElement('div');
        imageItem.className = 'image-item';

        var image = document.createElement('img');
        image.className = 'preview-image';
        image.alt = '合成预览 ' + (index + 1);
        image.src = (it.dataURL || it.url || it);
        image.addEventListener('click', function() {
            if (image.src) {
                showImageModal(image.src, '合成预览 #' + (index + 1));
            } else {
                showMessage('图片加载中，请稍后再试', 'warning');
            }
        });

        var fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        if (customText && customText.trim()) {
            fileInfo.innerHTML = '<span class="file-name">' + customText + '</span><span class="file-index">#' + (index + 1) + '</span>';
        } else {
            fileInfo.innerHTML = '<span class="file-name">合成预览 #' + (index + 1) + '</span><span class="file-index">#' + (index + 1) + '</span>';
        }

        imageItem.appendChild(image);
        imageItem.appendChild(fileInfo);
        container.appendChild(imageItem);
    });

    var countInfo = document.createElement('div');
    countInfo.className = 'image-count';
    countInfo.textContent = '共找到 ' + items.length + ' 张图片';
    container.appendChild(countInfo);
}
// 显示图片放大模态框
function showImageModal(imageData, fileName) {
    // 创建模态框
    var modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        cursor: pointer;
    `;
    
    // 创建图片容器
    var imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        position: relative;
        cursor: default;
    `;
    
    // 创建图片元素
    var image = document.createElement('img');
    image.src = imageData;
    image.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    // 创建文件名显示
    var fileNameDiv = document.createElement('div');
    fileNameDiv.textContent = fileName;
    fileNameDiv.style.cssText = `
        position: absolute;
        bottom: -40px;
        left: 0;
        right: 0;
        text-align: center;
        color: white;
        font-size: 14px;
        background-color: rgba(0, 0, 0, 0.7);
        padding: 8px;
        border-radius: 4px;
    `;
    
    // 创建关闭按钮
    var closeBtn = document.createElement('div');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: -40px;
        right: 0;
        width: 30px;
        height: 30px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        font-size: 20px;
        font-weight: bold;
    `;
    
    // 添加关闭事件
    closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        document.body.removeChild(modal);
    });
    
    // 点击模态框背景关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // 组装模态框
    imageContainer.appendChild(image);
    imageContainer.appendChild(fileNameDiv);
    imageContainer.appendChild(closeBtn);
    modal.appendChild(imageContainer);
    
    // 添加到页面
    document.body.appendChild(modal);
}
// 显示嵌套文件夹收集结果
function displayNestedFolderResults(data, totalFolders) {
    var container = document.getElementById('imagePreviewContainer');
    if (!container) return;
    
    // 清空容器
    container.innerHTML = '';
    
            // 创建标题
        var title = document.createElement('div');
        title.className = 'nested-results-title';
        title.style.cssText = `
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 16px;
            color: #333;
            text-align: center;
            padding: 8px;
            background-color: #f0f8ff;
            border-radius: 4px;
            border: 2px solid #0066cc;
            grid-column: 1 / -1;
        `;
        title.textContent = '嵌套文件夹收集结果 - 共 ' + totalFolders + ' 个文件夹';
        container.appendChild(title);
    
    // 遍历每个文件夹的结果
    for (var i = 0; i < data.length; i++) {
        var folderImages = data[i];
        
        // 创建文件夹组
        var folderGroup = document.createElement('div');
        folderGroup.className = 'folder-group image-item';
        folderGroup.style.cssText = `
            margin-bottom: 20px;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background-color: #fafafa;
        `;
        
        // 文件夹信息头部
        var folderHeader = document.createElement('div');
        folderHeader.className = 'folder-header';
        folderHeader.style.cssText = `
            font-weight: bold;
            margin-bottom: 8px;
            color: #0066cc;
            font-size: 14px;
        `;
        folderHeader.textContent = '第 ' + (i + 1) + ' 个文件夹: 包含 ' + folderImages.length + ' 张图片';
        folderGroup.appendChild(folderHeader);
        
        // 图片数组信息
        var arrayInfo = document.createElement('div');
        arrayInfo.className = 'array-info';
        arrayInfo.style.cssText = `
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
            padding: 4px 8px;
            background-color: #f0f0f0;
            border-radius: 4px;
            font-family: monospace;
        `;
        arrayInfo.textContent = '数组长度: ' + folderImages.length + ' - [' + (folderImages.length > 0 ? '"图片路径1", "图片路径2", ...' : '空数组') + ']';
        folderGroup.appendChild(arrayInfo);
        
        // 如果有图片，显示前几张的预览
        if (folderImages.length > 0) {
            var previewContainer = document.createElement('div');
            previewContainer.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                gap: 8px;
                margin-top: 8px;
            `;
            
            // 显示前6张图片的预览
            var previewCount = Math.min(6, folderImages.length);
            for (var j = 0; j < previewCount; j++) {
                var imagePath = folderImages[j];
                var previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    font-size: 10px;
                    color: #666;
                `;
                
                var previewImage = document.createElement('div');
                previewImage.style.cssText = `
                    width: 60px;
                    height: 60px;
                    background-color: #e0e0e0;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    color: #999;
                    margin-bottom: 4px;
                `;
                previewImage.textContent = '图 ' + (j + 1);
                
                var fileName = imagePath.split(/[\\\/]/).pop();
                var fileLabel = document.createElement('div');
                fileLabel.style.cssText = 'text-align: center; word-break: break-all;';
                fileLabel.textContent = fileName.length > 15 ? fileName.substring(0, 15) + '...' : fileName;
                
                previewItem.appendChild(previewImage);
                previewItem.appendChild(fileLabel);
                previewContainer.appendChild(previewItem);
            }
            
            // 如果图片数量超过预览数量，显示省略信息
            if (folderImages.length > previewCount) {
                var moreInfo = document.createElement('div');
                moreInfo.style.cssText = `
                    grid-column: 1 / -1;
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                    padding: 8px;
                    background-color: #f5f5f5;
                    border-radius: 4px;
                `;
                moreInfo.textContent = '... 还有 ' + (folderImages.length - previewCount) + ' 张图片';
                previewContainer.appendChild(moreInfo);
            }
            
            folderGroup.appendChild(previewContainer);
        }
        
        container.appendChild(folderGroup);
    }
    
    // 添加总结信息
    var summary = document.createElement('div');
    summary.className = 'results-summary';
    summary.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background-color: #e8f5e8;
        border-radius: 8px;
        border: 2px solid #4caf50;
        text-align: center;
        font-weight: bold;
        color: #2e7d32;
        grid-column: 1 / -1;
    `;
    
    var totalImages = 0;
    for (var k = 0; k < data.length; k++) {
        totalImages += data[k].length;
    }
    
    summary.textContent = '收集完成！共处理 ' + data.length + ' 个文件夹，总计 ' + totalImages + ' 张图片';
    container.appendChild(summary);
}

// 显示嵌套文件夹图层映射预览
function displayNestedFolderPreview(layerMapping) {
    var container = document.getElementById('imagePreviewContainer');
    if (!container) return;
    
    // 清空容器
    container.innerHTML = '';
    
    // 创建标题
    var title = document.createElement('div');
    title.className = 'nested-preview-title';
    title.style.cssText = `
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 16px;
        color: #333;
        text-align: center;
        padding: 12px;
        background-color: #e8f5e8;
        border-radius: 6px;
        border: 2px solid #4caf50;
        grid-column: 1 / -1;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    title.textContent = '🎯 图层映射预览 - 共 ' + Object.keys(layerMapping).length + ' 个图层';
    container.appendChild(title);
    
    // 创建预览网格
    var previewGrid = document.createElement('div');
    previewGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 16px;
        margin-top: 16px;
    `;
    
    // 遍历layerMapping显示预览
    var count = 0;
    for (var layerName in layerMapping) {
        if (layerMapping.hasOwnProperty(layerName)) {
            var imagePath = layerMapping[layerName];
            
            // 创建图层预览项
            var previewItem = document.createElement('div');
            previewItem.className = 'layer-preview-item';
            previewItem.style.cssText = `
                border: 2px solid #e0e0e0;
                border-radius: 12px;
                padding: 12px;
                background-color: #ffffff;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow: hidden;
            `;
            
            // 图层名称（作为标题）
            var layerNameDiv = document.createElement('div');
            layerNameDiv.style.cssText = `
                font-weight: bold;
                color: #0066cc;
                margin-bottom: 12px;
                font-size: 16px;
                background-color: #f0f8ff;
                padding: 8px 12px;
                border-radius: 6px;
                border-left: 4px solid #0066cc;
                text-align: center;
            `;
            layerNameDiv.textContent = '📋 ' + layerName;
            previewItem.appendChild(layerNameDiv);
            
            // 图片预览容器
            var imageContainer = document.createElement('div');
            imageContainer.style.cssText = `
                width: 100%;
                height: 150px;
                background-color: #f8f9fa;
                border-radius: 8px;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px dashed #dee2e6;
                overflow: hidden;
                position: relative;
            `;
            
            // 创建图片元素
            var img = document.createElement('img');
            img.style.cssText = `
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                border-radius: 6px;
            `;
            img.alt = layerName;
            
            // 图片加载成功
            img.onload = function() {
                this.style.display = 'block';
                this.parentElement.style.border = '2px solid #28a745';
                this.parentElement.style.backgroundColor = '#ffffff';
            };
            
            // 图片加载失败
            img.onerror = function() {
                this.style.display = 'none';
                this.parentElement.innerHTML = '<div style="color: #6c757d; font-size: 14px; text-align: center;">🖼️ 图片加载失败</div>';
            };
            
            // 设置图片源
            img.src = 'file:///' + imagePath.replace(/\\/g, '/');
            
            imageContainer.appendChild(img);
            previewItem.appendChild(imageContainer);
            
            // 图片文件名
            var fileName = imagePath.split(/[\\\/]/).pop(); // 获取文件名
            var fileNameDiv = document.createElement('div');
            fileNameDiv.style.cssText = `
                font-size: 12px;
                color: #495057;
                margin-bottom: 8px;
                font-weight: 500;
                text-align: center;
                background-color: #f8f9fa;
                padding: 4px 8px;
                border-radius: 4px;
                word-break: break-all;
            `;
            fileNameDiv.textContent = '🖼️ ' + fileName;
            previewItem.appendChild(fileNameDiv);
            
            // 添加悬停效果
            previewItem.onmouseenter = function() {
                this.style.transform = 'translateY(-4px)';
                this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                this.style.borderColor = '#0066cc';
            };
            previewItem.onmouseleave = function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                this.style.borderColor = '#e0e0e0';
            };
            
            previewGrid.appendChild(previewItem);
            count++;
        }
    }
    
    container.appendChild(previewGrid);
    
    // 添加操作提示
    var tipDiv = document.createElement('div');
    tipDiv.style.cssText = `
        margin-top: 20px;
        padding: 16px;
        background-color: #d4edda;
        border: 2px solid #c3e6cb;
        border-radius: 8px;
        color: #155724;
        font-size: 14px;
        text-align: center;
        font-weight: 500;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    tipDiv.textContent = '✅ 数据收集完成！共收集到 ' + Object.keys(layerMapping).length + ' 个图层映射，现在可以点击"嵌套文件夹一键渲染"按钮进行渲染';
    container.appendChild(tipDiv);
}
// 复制文本到剪贴板的辅助函数
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        // 使用现代 Clipboard API
        navigator.clipboard.writeText(text).then(function() {
            console.log('文本已复制到剪贴板');
        }).catch(function(err) {
            console.error('复制失败:', err);
            fallbackCopyToClipboard(text);
        });
    } else {
        // 降级方案
        fallbackCopyToClipboard(text);
    }
}
// 降级复制方案
function fallbackCopyToClipboard(text) {
    var textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        var successful = document.execCommand('copy');
        if (successful) {
            console.log('文本已复制到剪贴板（降级方案）');
        } else {
            console.error('复制失败');
        }
    } catch (err) {
        console.error('复制失败:', err);
    }
    
    document.body.removeChild(textArea);
}