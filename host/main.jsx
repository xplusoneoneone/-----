/*
 * @Author: 徐佳德 1404577549@qq.com
 * @Date: 2025-08-07 10:29:19
 * @LastEditors: 徐佳德 1404577549@qq.com
 * @LastEditTime: 2025-08-12 16:28:35
 * @FilePath: \图像类插件\host\main.jsx
 * @Description: ExtendScript主文件 - 处理Photoshop操作
 */









// 在智能图层编辑模式下处理图片复制粘贴操作（使用索引）
function processSmartObjectEdit(imageIndex) {
    try {
        // 等待一下确保编辑模式已完全进入
        $.sleep(1000);
        
        // 获取当前编辑的文档
        var editDoc = app.activeDocument;
        
        // 获取所有打开的文档
        var allDocs = app.documents;
        var imageDocs = [];
        
        // 收集所有图片文档（排除当前编辑的文档）
        for(var i = 0; i < allDocs.length; i++) {
            if(allDocs[i].name !== editDoc.name) {
                imageDocs.push(allDocs[i]);
            }
        }
        
        // 如果没有其他图片文档，返回错误
        if(imageDocs.length === 0) {
            return "no_image_documents";
        }
        
        // 检查图片索引是否有效
        if(imageIndex >= imageDocs.length) {
            return "image_index_out_of_range";
        }
        
        // 只处理指定索引的图片文档
        try {
            // 激活指定索引的图片文档
            app.activeDocument = imageDocs[imageIndex];
            
            // 全选图片内容
            app.activeDocument.selection.selectAll();
            
            // 复制图片内容
            app.activeDocument.selection.copy();
            
            // 等待复制完成
            $.sleep(500);
            
            // 切换到编辑文档
            app.activeDocument = editDoc;
            
            // 粘贴图片内容
            app.activeDocument.paste();
            
            // 等待粘贴完成
            $.sleep(500);
            
        } catch(docError) {
            return "copy_paste_error: " + docError.message;
        }
        
        // 保存编辑的文档
        editDoc.save();
        
        // 关闭编辑的文档，回到主文档
        editDoc.close(SaveOptions.DONOTSAVECHANGES);
        
        return "success";
        
    } catch (error) {
        return "error: " + error.message;
    }
}

// 在智能图层编辑模式下处理图片复制粘贴操作（使用文档引用）
function processSmartObjectEditWithDoc(targetImageDoc) {
    try {
        // 等待一下确保编辑模式已完全进入
        $.sleep(1000);
        
        // 获取当前编辑的文档
        var editDoc = app.activeDocument;
        
        // 只处理指定的图片文档
        try {
            // 激活指定的图片文档
            app.activeDocument = targetImageDoc;
            
            // 全选图片内容
            app.activeDocument.selection.selectAll();
            
            // 复制图片内容
            app.activeDocument.selection.copy();
            
            // 等待复制完成
            $.sleep(500);
            
            // 切换到编辑文档
            app.activeDocument = editDoc;
            
            // 粘贴图片内容
            app.activeDocument.paste();
            
            // 等待粘贴完成
            $.sleep(500);
            
        } catch(docError) {
            return "copy_paste_error: " + docError.message;
        }
        
        // 保存编辑的文档
        editDoc.save();
        
        // 关闭编辑的文档，回到主文档
        editDoc.close(SaveOptions.DONOTSAVECHANGES);
        
        return "success";
        
    } catch (error) {
        return "error: " + error.message;
    }
}

// 获取图层索引的辅助函数
function getLayerIndex(layer) {
    var doc = layer.parent;
    for(var i = 0; i < doc.layers.length; i++) {
        if(doc.layers[i] === layer) {
            return i;
        }
    }
    return -1;
}

// 创建命令描述符的辅助函数（保留以备将来使用）
function createCommandDescriptor(commandID, canDispatchWhileModal) {
    var desc = new ActionDescriptor();
    desc.putInteger(stringIDToTypeID("commandID"), commandID);
    desc.putBoolean(stringIDToTypeID("kcanDispatchWhileModal"), canDispatchWhileModal);
    return desc;
}

// 收集图片路径的函数
function collectImagePaths(inputPath) {
    try {
        var imagePaths = [];
        var folder = new Folder(inputPath);
        
        if (!folder.exists) {
            return "folder_not_exists";
        }
        
        // 支持的图片格式
        var imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".tif"];
        
        // 获取文件夹中的所有文件
        var files = folder.getFiles();
        
        // 过滤图片文件，保持文件系统中的原始顺序
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (file instanceof File) {
                var fileName = file.name.toLowerCase();
                var isImage = false;
                
                // 检查是否为图片文件
                for (var j = 0; j < imageExtensions.length; j++) {
                    if (fileName.indexOf(imageExtensions[j]) !== -1) {
                        isImage = true;
                        break;
                    }
                }
                
                if (isImage) {
                    imagePaths.push(file.fsName); // 使用完整路径，保持原始顺序
                }
            }
        }
        
        // 按文件名排序（支持数字排序）
        imagePaths.sort(function(a, b) {
            var fileNameA = a.split("/").pop().toLowerCase();
            var fileNameB = b.split("/").pop().toLowerCase();
            
            // 提取文件名中的数字部分进行自然排序
            var numA = fileNameA.match(/\d+/);
            var numB = fileNameB.match(/\d+/);
            
            if (numA && numB) {
                // 如果两个文件名都包含数字，按数字排序
                var numAVal = parseInt(numA[0]);
                var numBVal = parseInt(numB[0]);
                if (numAVal !== numBVal) {
                    return numAVal - numBVal;
                }
            }
            
            // 如果数字相同或没有数字，按字符串排序
            return fileNameA.localeCompare(fileNameB);
        });
        
        return imagePaths;
        
    } catch (error) {
        return "error: " + error.message;
    }
}

// 进入智能图层编辑模式
function enterSmartObjectEditMode() {
    try {
        // 方法1：使用智能对象编辑内容命令
        try {
            var desc = new ActionDescriptor();
            executeAction(stringIDToTypeID("placedLayerEditContents"), desc, DialogModes.NO);
            return "success";
        } catch (error1) {
            // 方法2：使用编辑内容命令
            try {
                var desc2 = new ActionDescriptor();
                executeAction(stringIDToTypeID("editContents"), desc2, DialogModes.NO);
                return "success";
            } catch (error2) {
                // 方法3：使用双击智能对象命令
                try {
                    var desc3 = new ActionDescriptor();
                    executeAction(stringIDToTypeID("doubleClick"), desc3, DialogModes.NO);
                    return "success";
                } catch (error3) {
                    // 方法4：使用工具模态状态命令（原始方法）
                    try {
                        var idtoolModalStateChanged = stringIDToTypeID("toolModalStateChanged");
                        var desc444 = new ActionDescriptor();
                        var idLvl = charIDToTypeID("Lvl ");
                        desc444.putInteger(idLvl, 1);
                        var idStte = charIDToTypeID("Stte");
                        var identer = stringIDToTypeID("enter");
                        desc444.putEnumerated(idStte, idStte, identer);
                        var idTool = charIDToTypeID("Tool");
                        var desc445 = new ActionDescriptor();
                        var idIdnt = charIDToTypeID("Idnt");
                        desc445.putString(idIdnt, "arwT");
                        var idTtl = charIDToTypeID("Ttl ");
                        desc445.putString(idTtl, " ƶ     ");
                        desc444.putObject(idTool, idTool, desc445);
                        var idKnd = charIDToTypeID("Knd ");
                        desc444.putEnumerated(idKnd, idKnd, idTool);
                        var idkcanDispatchWhileModal = stringIDToTypeID("kcanDispatchWhileModal");
                        desc444.putBoolean(idkcanDispatchWhileModal, true);
                        executeAction(idtoolModalStateChanged, desc444, DialogModes.NO);
                        return "success";
                    } catch (error4) {
                        // 方法5：使用菜单命令
                        try {
                            app.executeAction(stringIDToTypeID("placedLayerEditContents"), undefined, DialogModes.NO);
                            return "success";
                        } catch (error5) {
                            throw new Error("所有进入智能图层编辑模式的方法都失败了。错误信息: " + error1.message + ", " + error2.message + ", " + error3.message + ", " + error4.message + ", " + error5.message);
                        }
                    }
                }
            }
        }
    } catch (error) {
        return "error: " + error.message;
    }
}

// 在编辑模式下放置图片
function placeImageInEditMode(imagePath) {
    try {
        // 验证图片文件是否存在
        var imageFile = new File(imagePath);
        if (!imageFile.exists) {
            return "image_file_not_exists";
        }
        
        // 放置图片文件
        var idPlc = charIDToTypeID("Plc ");
        var desc448 = new ActionDescriptor();
        var idIdnt2 = charIDToTypeID("Idnt");
        desc448.putInteger(idIdnt2, 12);
        var idnull = charIDToTypeID("null");
        desc448.putPath(idnull, imageFile);
        var idFTcs = charIDToTypeID("FTcs");
        var idQCSt = charIDToTypeID("QCSt");
        var idQcsa = charIDToTypeID("Qcsa");
        desc448.putEnumerated(idFTcs, idQCSt, idQcsa);
        var idOfst = charIDToTypeID("Ofst");
        var desc449 = new ActionDescriptor();
        var idHrzn = charIDToTypeID("Hrzn");
        var idRlt = charIDToTypeID("#Rlt");
        desc449.putUnitDouble(idHrzn, idRlt, 0.000000);
        var idVrtc = charIDToTypeID("Vrtc");
        desc449.putUnitDouble(idVrtc, idRlt, 0.000000);
        desc448.putObject(idOfst, idOfst, desc449);
        executeAction(idPlc, desc448, DialogModes.NO);
        
        // 等待一下确保图片放置完成
        $.sleep(500);
        
        // 移动图层到正确位置
        var idmove = charIDToTypeID("move");
        var desc450 = new ActionDescriptor();
        var idnull2 = charIDToTypeID("null");
        var ref63 = new ActionReference();
        var idLyr = charIDToTypeID("Lyr ");
        var idOrdn = charIDToTypeID("Ordn");
        var idTrgt = charIDToTypeID("Trgt");
        ref63.putEnumerated(idLyr, idOrdn, idTrgt);
        desc450.putReference(idnull2, ref63);
        var idT = charIDToTypeID("T   ");
        var ref64 = new ActionReference();
        var idLyr2 = charIDToTypeID("Lyr ");
        ref64.putIndex(idLyr2, 0);
        desc450.putReference(idT, ref64);
        var idAdjs = charIDToTypeID("Adjs");
        desc450.putBoolean(idAdjs, false);
        var idVrsn = charIDToTypeID("Vrsn");
        desc450.putInteger(idVrsn, 5);
        var idLyrI = charIDToTypeID("LyrI");
        var list24 = new ActionList();
        list24.putInteger(12);
        desc450.putList(idLyrI, list24);
        executeAction(idmove, desc450, DialogModes.NO);
        
        // 等待一下确保移动完成
        $.sleep(500);
        
        // 获取当前图层并检查尺寸
        var currentLayer = app.activeDocument.activeLayer;
        var layerWidth = currentLayer.bounds[2] - currentLayer.bounds[0];
        var layerHeight = currentLayer.bounds[3] - currentLayer.bounds[1];
        
        // 显示尺寸信息用于调试
        var ratio = layerWidth / layerHeight;
        
        // 检查是否需要旋转（宽度明显大于高度，且比例超过1.2）
        if (layerWidth > layerHeight * 1.2) {
            // 进入自由变换模式
            var idTrnf = charIDToTypeID("Trnf");
            var desc451 = new ActionDescriptor();
            var idnull3 = charIDToTypeID("null");
            var ref65 = new ActionReference();
            var idLyr3 = charIDToTypeID("Lyr ");
            var idOrdn2 = charIDToTypeID("Ordn");
            var idTrgt2 = charIDToTypeID("Trgt");
            ref65.putEnumerated(idLyr3, idOrdn2, idTrgt2);
            desc451.putReference(idnull3, ref65);
            executeAction(idTrnf, desc451, DialogModes.NO);
            
            // 等待自由变换模式进入
            $.sleep(100);
            
            
            // 设置位置、尺寸和角度：使用完整的自由变换命令
            var idTrnf2 = charIDToTypeID("Trnf");
            var desc453 = new ActionDescriptor();
            var idnull5 = charIDToTypeID("null");
            var ref67 = new ActionReference();
            var idLyr5 = charIDToTypeID("Lyr ");
            var idOrdn4 = charIDToTypeID("Ordn");
            var idTrgt4 = charIDToTypeID("Trgt");
            ref67.putEnumerated(idLyr5, idOrdn4, idTrgt4);
            desc453.putReference(idnull5, ref67);
            
            // 设置偏移位置（相对位置）
            var idOfst = charIDToTypeID("Ofst");
            var desc454 = new ActionDescriptor();
            var idHrzn2 = charIDToTypeID("Hrzn");
            var idRlt = charIDToTypeID("#Rlt");
            desc454.putUnitDouble(idHrzn2, idRlt, 0.0000);
            var idVrtc2 = charIDToTypeID("Vrtc");
            desc454.putUnitDouble(idVrtc2, idRlt, -9.360000);
            desc453.putObject(idOfst, idOfst, desc454);
            
            
            // 设置宽度（百分比）
            var idWdth = charIDToTypeID("Wdth");
            var idPrc = charIDToTypeID("#Prc");
            desc453.putUnitDouble(idWdth, idPrc, 140.120587);
            
            // 设置高度（百分比）
            var idHght = charIDToTypeID("Hght");
            desc453.putUnitDouble(idHght, idPrc, 120.510863);
            
            // 设置旋转角度
            var idAngl = charIDToTypeID("Angl");
            var idAng = charIDToTypeID("#Ang");
            desc453.putUnitDouble(idAngl, idAng, 90.000000);
            
            
            // 执行变换
            executeAction(idTrnf2, desc453, DialogModes.NO);
            
            // 等待变换完成
            $.sleep(400);
            
            // 提交变换
            var idCmtd = charIDToTypeID("Cmtd");
            var desc456 = new ActionDescriptor();
            var idnull6 = charIDToTypeID("null");
            var ref68 = new ActionReference();
            var idLyr6 = charIDToTypeID("Lyr ");
            var idOrdn5 = charIDToTypeID("Ordn");
            var idTrgt5 = charIDToTypeID("Trgt");
            ref68.putEnumerated(idLyr6, idOrdn5, idTrgt5);
            desc456.putReference(idnull6, ref68);
            executeAction(idCmtd, desc456, DialogModes.NO);
            
            // 等待提交完成
            $.sleep(500);
        }
        
        return "success";
    } catch (error) {
        return "error: " + error.message;
    }
}

// 退出智能图层编辑模式
function exitSmartObjectEditMode() {
    try {
        // 方法1：使用工具模态状态命令退出
        try {
            var idtoolModalStateChanged2 = stringIDToTypeID("toolModalStateChanged");
            var desc446 = new ActionDescriptor();
            var idLvl2 = charIDToTypeID("Lvl ");
            desc446.putInteger(idLvl2, 0);
            var idStte2 = charIDToTypeID("Stte");
            var idexit = stringIDToTypeID("exit");
            desc446.putEnumerated(idStte2, idStte2, idexit);
            var idTool2 = charIDToTypeID("Tool");
            var desc447 = new ActionDescriptor();
            var idIdnt3 = charIDToTypeID("Idnt");
            desc447.putString(idIdnt3, "arwT");
            var idTtl2 = charIDToTypeID("Ttl ");
            desc447.putString(idTtl2, " ƶ     ");
            desc446.putObject(idTool2, idTool2, desc447);
            var idKnd2 = charIDToTypeID("Knd ");
            desc446.putEnumerated(idKnd2, idKnd2, idTool2);
            var idreason = stringIDToTypeID("reason");
            var idcommit = stringIDToTypeID("commit");
            desc446.putEnumerated(idreason, idreason, idcommit);
            executeAction(idtoolModalStateChanged2, desc446, DialogModes.NO);
            return "success";
        } catch (error1) {
            // 方法2：使用关闭文档命令
            try {
                var currentDoc = app.activeDocument;
                currentDoc.close(SaveOptions.SAVECHANGES);
                return "success";
            } catch (error2) {
                // 方法3：使用保存并关闭命令
                try {
                    var desc = new ActionDescriptor();
                    executeAction(stringIDToTypeID("save"), desc, DialogModes.NO);
                    
                    var desc2 = new ActionDescriptor();
                    executeAction(stringIDToTypeID("close"), desc2, DialogModes.NO);
                    return "success";
                } catch (error3) {
                    throw new Error("所有退出智能图层编辑模式的方法都失败了。错误信息: " + error1.message + ", " + error2.message + ", " + error3.message);
                }
            }
        }
    } catch (error) {
        return "error: " + error.message;
    }
}

// 使用Place命令放置图片到智能图层（旧版本，保持兼容性）
function placeImageInSmartObject(imagePath) {
    try {
        // 进入智能图层编辑模式
        var enterResult = enterSmartObjectEditMode();
        if(enterResult !== "success") {
            return "enter_failed: " + enterResult;
        }
        
        // 等待一下确保编辑模式已进入
        $.sleep(1000);
        
        // 在编辑模式下放置图片
        var placeResult = placeImageInEditMode(imagePath);
        if(placeResult !== "success") {
            return "place_failed: " + placeResult;
        }
        
        // 保存并退出编辑模式
        var exitResult = exitSmartObjectEditMode();
        if(exitResult !== "success") {
            return "exit_failed: " + exitResult;
        }
        
        return "success";
    } catch (error) {
        return "error: " + error.message;
    }
}



//获取图层组并编辑其中的图层（使用Place命令放置图片）
function getLayerSets(name, inputPath){
    try {
        if (app.documents.length === 0) {
            return "no_document";
        }

        // 收集图片路径
        var imagePaths = collectImagePaths(inputPath);
        if (typeof imagePaths === "string" && imagePaths.startsWith("error:")) {
            return imagePaths;
        }
        if (imagePaths.length === 0) {
            return "no_images_found";
        }
        
        var layerSets = app.activeDocument.layerSets;
        var foundGroups = [];
        var imageIndex = 0;
        for(var i = layerSets.length-1; i >= 0; i--){
            if(layerSets[i].name === name){
                // 获取该图层组内所有图层
                var layers = layerSets[i].layers;
                var layerNames = [];
                
                // 遍历图层组内的每个图层
                for(var j = layers.length-1; j >= 0; j--){
                    var layer = layers[j];
                    layerNames.push(layer.name);
                    
                    // 检查是否为智能图层
                    if(layer.kind === LayerKind.SMARTOBJECT) {
                        try {
                            
                            // 检查是否有对应的图片路径
                            if(imageIndex >= imagePaths.length) {
                                layerNames[layerNames.length - 1] += "(没有对应的图片路径)";
                                return 'found';
                            }
                            
                            // 保存主文档的引用
                            var mainDoc = app.activeDocument;
                            
                            // 选中该图层
                            mainDoc.activeLayer = layer;
                            // 进入智能图层编辑模式
                            var editResult = enterSmartObjectEditMode();
                            if(editResult !== "success") {
                                layerNames[layerNames.length - 1] += "(进入编辑模式失败: " + editResult + ")";
                                return 'enter_failed: ' + editResult;
                            }
                            
                            // 等待一下确保编辑模式已进入
                            $.sleep(500);
                            
                            // 在编辑模式下放置图片
                            var placeResult = placeImageInEditMode(imagePaths[imageIndex++]);
                            
                            if(placeResult !== "success") {
                                layerNames[layerNames.length - 1] += "(放置失败: " + placeResult + ")";
                            } else {
                                layerNames[layerNames.length - 1] += "(已放置图片: " + imagePaths[imageIndex-1].split("/").pop() + ")";
                            }
                            
                            // 保存编辑的文档
                            var editDoc = app.activeDocument;
                            editDoc.save();
                            
                            // 等待一下确保保存完成
                            $.sleep(500);
                            
                            // 保存并退出编辑模式
                            var exitResult = exitSmartObjectEditMode();
                            if(exitResult !== "success") {
                                layerNames[layerNames.length - 1] += "(退出编辑模式失败: " + exitResult + ")";
                            }
                            
                            // 等待一下确保回到主文档
                            $.sleep(500);
                            
                            // 提示处理完成
                            
                        } catch(editError) {
                            // 如果编辑失败，记录错误但继续处理下一个图层
                            layerNames[layerNames.length - 1] += "(编辑失败: " + editError.message + ")";
                        }
                    } else {
                        // 如果不是智能图层，标记为非智能图层
                        layerNames[layerNames.length - 1] += "(非智能图层)";
                    }
                }
                
                foundGroups.push("第" + (foundGroups.length + 1) + "个" + layerSets[i].name + " (处理图层: " + layerNames.join(", ") + ")");
            }
        }
        
        if(foundGroups.length > 0) {
            return "found: " + foundGroups.join(" | ");
        }
        return "not_found";
    } catch (error) {
        return "error: " + error.message;
    }
}

// 兼容性函数：不带图片路径的版本（保持向后兼容）
function getLayerSetsWithoutImages(name){
    try {
        if (app.documents.length === 0) {
            return "no_document";
        }

        var layerSets = app.activeDocument.layerSets;
        var foundGroups = [];
        
        for(var i = 0; i < layerSets.length; i++){
            if(layerSets[i].name === name){
                // 获取该图层组内所有图层
                var layers = layerSets[i].layers;
                var layerNames = [];
                
                // 遍历图层组内的每个图层
                for(var j = 0; j < layers.length; j++){
                    var layer = layers[j];
                    layerNames.push(layer.name);
                    
                    // 检查是否为智能图层
                    if(layer.kind === LayerKind.SMARTOBJECT) {
                        try {
                            // 保存主文档的引用
                            var mainDoc = app.activeDocument;
                            
                            // 选中该图层
                            mainDoc.activeLayer = layer;
                            
                            // 进入智能图层编辑模式
                            var editResult = enterSmartObjectEditMode();
                            if(editResult !== "success") {
                                layerNames[layerNames.length - 1] += "(进入编辑模式失败: " + editResult + ")";
                                continue;
                            }
                            
                            // 等待一下确保编辑模式已进入
                            $.sleep(1000);
                            
                            // 保存编辑的文档
                            var editDoc = app.activeDocument;
                            editDoc.save();
                            
                            // 等待一下确保保存完成
                            $.sleep(500);
                            
                            // 保存并退出编辑模式
                            var exitResult = exitSmartObjectEditMode();
                            if(exitResult !== "success") {
                                layerNames[layerNames.length - 1] += "(退出编辑模式失败: " + exitResult + ")";
                            }
                            
                            // 等待一下确保回到主文档
                            $.sleep(500);
                            
                        } catch(editError) {
                            // 如果编辑失败，记录错误但继续处理下一个图层
                            layerNames[layerNames.length - 1] += "(编辑失败: " + editError.message + ")";
                        }
                    } else {
                        // 如果不是智能图层，标记为非智能图层
                        layerNames[layerNames.length - 1] += "(非智能图层)";
                    }
                }
                
                foundGroups.push("第" + (foundGroups.length + 1) + "个" + layerSets[i].name + " (处理图层: " + layerNames.join(", ") + ")");
            }
        }
        
        if(foundGroups.length > 0) {
            return "found: " + foundGroups.join(" | ");
        }
        return "not_found";
    } catch (error) {
        return "error: " + error.message;
    }
}
