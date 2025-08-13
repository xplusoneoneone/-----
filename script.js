/*
 * @Author: 徐佳德 1404577549@qq.com
 * @Date: 2025-08-07 10:29:19
 * @LastEditors: 徐佳德 1404577549@qq.com
 * @LastEditTime: 2025-08-12 17:37:25
 * @FilePath: \图像类插件\script.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

// 获取CEP接口
var csInterface = new CSInterface();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 获取选择文件夹按钮
    var selectFolderBtn = document.getElementById('selectFolderBtn');
    var imagePathInput = document.getElementById('imagePathInput');
    var editAndContinueBtn = document.getElementById('editAndContinueBtn');
    
    // 选择文件夹按钮事件
    selectFolderBtn.addEventListener('click', function() {
        console.log('点击了选择文件夹按钮');
        
        // 创建文件夹选择对话框
        var folderInput = document.createElement('input');
        folderInput.type = 'file';
        folderInput.webkitdirectory = true;
        folderInput.style.display = 'none';
        
        folderInput.addEventListener('change', function(e) {
            var files = Array.from(e.target.files);
            if (files.length > 0) {
                // 获取文件夹路径并显示在输入框中
                var imagePath = files[0].path;
                imagePathInput.value = imagePath;
                showMessage('已选择文件夹: ' + imagePath, 'success');
                
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
    
    // 按文件名排序（支持数字排序）
    imageFiles.sort(function(a, b) {
        var nameA = a.name.toLowerCase();
        var nameB = b.name.toLowerCase();
        
        // 提取文件名中的数字部分进行自然排序
        var numA = nameA.match(/\d+/);
        var numB = nameB.match(/\d+/);
        
        if (numA && numB) {
            // 如果两个文件名都包含数字，按数字排序
            var numAVal = parseInt(numA[0]);
            var numBVal = parseInt(numB[0]);
            if (numAVal !== numBVal) {
                return numAVal - numBVal;
            }
        }
        
        // 如果数字相同或没有数字，按字符串排序
        return nameA.localeCompare(nameB);
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