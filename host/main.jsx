// ==================== 配置常量 ====================
var TEMPLATE_IMAGE_COUNT = 18; // 一组中的图片数量

// 图片尺寸配置
var IMAGE_WIDTH = 4.9; // 图片宽度（厘米）
var IMAGE_HEIGHT = 6.9; // 图片高度（厘米）

// ==================== 辅助函数 ====================
// 获取图层索引的辅助函数
function getLayerIndex(layer) {
  var doc = layer.parent;
  for (var i = 0; i < doc.layers.length; i++) {
    if (doc.layers[i] === layer) {
      return i;
    }
  }
  return -1;
}

// ES3兼容的trim函数
function trim(str) {
  if (typeof str !== "string") return str;
  return str.replace(/^\s+|\s+$/g, "");
}

// 缩放当前图层
function scaleCurrentLayer(scalePercent) {
  try {
    var idTrnf = charIDToTypeID("Trnf");
    var desc = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref = new ActionReference();
    var idLyr = charIDToTypeID("Lyr ");
    var idOrdn = charIDToTypeID("Ordn");
    var idTrgt = charIDToTypeID("Trgt");
    ref.putEnumerated(idLyr, idOrdn, idTrgt);
    desc.putReference(idnull, ref);
    var idFTcs = charIDToTypeID("FTcs");
    var idQCSt = charIDToTypeID("QCSt");
    var idQcsa = charIDToTypeID("Qcsa");
    desc.putEnumerated(idFTcs, idQCSt, idQcsa);
    var idOfst = charIDToTypeID("Ofst");
    var desc2 = new ActionDescriptor();
    var idHrzn = charIDToTypeID("Hrzn");
    var idPxl = charIDToTypeID("#Pxl");
    desc2.putUnitDouble(idHrzn, idPxl, 0.0);
    var idVrtc = charIDToTypeID("Vrtc");
    desc2.putUnitDouble(idVrtc, idPxl, 0.0);
    desc.putObject(idOfst, idOfst, desc2);
    var idWdth = charIDToTypeID("Wdth");
    var idPrc = charIDToTypeID("#Prc");
    // 使用统一的缩放比例
    desc.putUnitDouble(idWdth, idPrc, scalePercent);
    var idHght = charIDToTypeID("Hght");
    desc.putUnitDouble(idHght, idPrc, scalePercent);

    var idIntr = charIDToTypeID("Intr");
    var idIntp = charIDToTypeID("Intp");
    var idBcbc = charIDToTypeID("Bcbc");
    desc.putEnumerated(idIntr, idIntp, idBcbc);
    executeAction(idTrnf, desc, DialogModes.NO);
    return "success";
  } catch (error) {
    return "error: " + error.message;
  }
}

// 计算最优缩放比例以铺满整个图层
function calculateOptimalScale(layerWidth, layerHeight) {
  try {
    // 获取当前文档（智能图层编辑模式下的文档）
    var currentDoc = app.activeDocument;

    // 获取当前图层（放置的图片）
    var currentLayer = currentDoc.activeLayer;

    // 获取图片的原始尺寸
    var imageWidth = currentLayer.bounds[2].value - currentLayer.bounds[0].value;
    var imageHeight = currentLayer.bounds[3].value - currentLayer.bounds[1].value;

    var targetWidthPixels = layerWidth;
    var targetHeightPixels = layerHeight;
    // 计算宽度和高度缩放比例
    var scalePercent = (targetWidthPixels / imageWidth) * 101;
    var scalePercent2 = (targetHeightPixels / imageHeight) * 101;

    // 使用较小的缩放比例，确保图片完全覆盖模板区域
    scalePercent = Math.max(scalePercent, scalePercent2);
    // 返回缩放百分比数值
    return Math.round(scalePercent);
  } catch (error) {
    // 如果计算出错，返回默认的105%缩放
    return 105;
  }
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
    var imageExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".bmp",
      ".tiff",
      ".tif",
    ];

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

    // 按文件名排序（改进的自然排序算法）
    imagePaths.sort(function (a, b) {
      var fileNameA = a.split("/").pop();
      var fileNameB = b.split("/").pop();

      // 检查是否包含"中包序号"
      var aHasZhongBao = fileNameA.indexOf("中包序号") !== -1;
      var bHasZhongBao = fileNameB.indexOf("中包序号") !== -1;

      // 如果一个包含"中包序号"而另一个不包含，包含的排到后面
      if (aHasZhongBao && !bHasZhongBao) {
        return 1;
      }
      if (!aHasZhongBao && bHasZhongBao) {
        return -1;
      }

      // 自然排序函数
      function naturalSort(a, b) {
        var ax = [],
          bx = [];

        a.replace(/(\d+)|(\D+)/g, function (_, $1, $2) {
          ax.push([$1 || Infinity, $2 || ""]);
        });
        b.replace(/(\d+)|(\D+)/g, function (_, $1, $2) {
          bx.push([$1 || Infinity, $2 || ""]);
        });

        while (ax.length && bx.length) {
          var an = ax.shift();
          var bn = bx.shift();
          var nn = an[0] - bn[0] || an[1].localeCompare(bn[1]);
          if (nn) return nn;
        }

        return ax.length - bx.length;
      }

      return naturalSort(fileNameA, fileNameB);
    });

    return imagePaths;
  } catch (error) {
    return "error: " + error.message;
  }
}

// 收集嵌套文件夹中的图片路径 - 新思路实现
function collectNestedImagePaths(parentFolderPath) {
  try {
    var parentFolder = new Folder(parentFolderPath);

    if (!parentFolder.exists) {
      return "folder_not_exists";
    }

    // 获取父文件夹下的所有项目
    var items = parentFolder.getFiles();
    var subFolders = [];

    // 筛选出所有子文件夹
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item instanceof Folder) {
        subFolders.push(item);
      }
    }

    if (subFolders.length === 0) {
      return "no_subfolders_found";
    }

    // 按文件夹名称排序（自然排序）
    subFolders.sort(function (a, b) {
      function naturalSort(nameA, nameB) {
        var ax = [],
          bx = [];

        nameA.replace(/(\d+)|(\D+)/g, function (_, $1, $2) {
          ax.push([$1 || Infinity, $2 || ""]);
        });
        nameB.replace(/(\d+)|(\D+)/g, function (_, $1, $2) {
          bx.push([$1 || Infinity, $2 || ""]);
        });

        while (ax.length && bx.length) {
          var an = ax.shift();
          var bn = bx.shift();
          var nn = an[0] - bn[0] || an[1].localeCompare(bn[1]);
          if (nn) return nn;
        }

        return ax.length - bx.length;
      }

      return naturalSort(a.name, b.name);
    });

    // 收集所有小文件夹的图片路径 [[文件夹1图片路径][文件夹2图片路径]]
    var allImagePaths = [];

    // 遍历每个子文件夹，收集图片路径
    for (var i = 0; i < subFolders.length; i++) {
      var subFolder = subFolders[i];
      var folderPath = subFolder.fsName;

      // 调用现有的 collectImagePaths 函数
      var imagePaths = collectImagePaths(folderPath);

      // 检查结果是否为错误信息
      if (typeof imagePaths === "string" && imagePaths.startsWith("error:")) {
        allImagePaths.push([]); // 添加空数组
      } else if (
        typeof imagePaths === "string" &&
        imagePaths === "folder_not_exists"
      ) {
        allImagePaths.push([]); // 添加空数组
      } else if (imagePaths instanceof Array) {
        // 成功获取图片路径
        allImagePaths.push(imagePaths);
      } else {
        // 其他情况，添加空数组
        allImagePaths.push([]);
      }
    }

    // 用for循环合成key-value对，用[{}]保存
    var layerPathMapping = {};
    var currentGroup = 1; // 当前组号
    var currentIndex = 0; // 当前组内索引 (0-14)
    var nextGroup = false;

    // 遍历所有文件夹的图片路径数组
    for (var folderIdx = 0; folderIdx < allImagePaths.length; folderIdx++) {
      var folderImages = allImagePaths[folderIdx];
      var imageCount = folderImages.length;
      if (imageCount === 0) continue;
      // 模板分配逻辑：
      // 1. 如果当前文件夹图片数量超过配置数量，独占模板（从1组开始）
      // 2. 如果当前模板空间不足，跳到下一个模板
      if (folderIdx === 0 && imageCount > TEMPLATE_IMAGE_COUNT) {
        currentGroup = 1;
        currentIndex = 0;
        nextGroup = true;
      } else if (folderIdx === 0 && imageCount <= TEMPLATE_IMAGE_COUNT) {
        currentGroup = 1;
        currentIndex = 0;
        nextGroup = false;
      } else if (nextGroup && imageCount > TEMPLATE_IMAGE_COUNT) {
        currentGroup++;
        nextGroup = true;
        currentIndex = 0;
      } else if (nextGroup && imageCount <= TEMPLATE_IMAGE_COUNT) {
        currentGroup++;
        nextGroup = false;
        currentIndex = 0;
      } else if (imageCount > TEMPLATE_IMAGE_COUNT) {
        // 单个文件夹超过配置数量张图片，独占模板
        currentGroup++;
        nextGroup = true;
        currentIndex = 0;
      } else if (currentIndex + imageCount > TEMPLATE_IMAGE_COUNT) {
        // 当前模板空间不足，跳到下一个模板
        currentGroup++;
        currentIndex = 0;
      }

      // 为当前文件夹的每张图片创建映射
      for (var imgIdx = 0; imgIdx < imageCount; imgIdx++) {
        var indexStr =
          currentIndex < 9
            ? "0" + (currentIndex + 1)
            : String(currentIndex + 1);
        var layerName = currentGroup + "组" + indexStr;
        layerPathMapping[layerName] = folderImages[imgIdx];

        currentIndex++;
        if (currentIndex >= TEMPLATE_IMAGE_COUNT) {
          // 当前模板已满，跳到下一个模板
          currentGroup++;
          currentIndex = 0;
        }
      }
    }

    // 计算layerPathMapping中的键数量（ExtendScript兼容方式）
    var layerMappingCount = 0;
    for (var key in layerPathMapping) {
      if (layerPathMapping.hasOwnProperty(key)) {
        layerMappingCount++;
      }
    }

    // 返回layerMapping对象的字符串表示（ES3兼容方式）
    var resultString = "{";
    var isFirst = true;
    for (var key in layerPathMapping) {
      if (layerPathMapping.hasOwnProperty(key)) {
        if (!isFirst) {
          resultString += ",";
        }
        resultString +=
          '"' +
          key +
          '":"' +
          layerPathMapping[key].replace(/\\/g, "\\\\").replace(/"/g, '\\"') +
          '"';
        isFirst = false;
      }
    }
    resultString += "}";
    return resultString;
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
      executeAction(
        stringIDToTypeID("placedLayerEditContents"),
        desc,
        DialogModes.NO
      );
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
            var idtoolModalStateChanged = stringIDToTypeID(
              "toolModalStateChanged"
            );
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
            var idkcanDispatchWhileModal = stringIDToTypeID(
              "kcanDispatchWhileModal"
            );
            desc444.putBoolean(idkcanDispatchWhileModal, true);
            executeAction(idtoolModalStateChanged, desc444, DialogModes.NO);
            return "success";
          } catch (error4) {
            // 方法5：使用菜单命令
            try {
              app.executeAction(
                stringIDToTypeID("placedLayerEditContents"),
                undefined,
                DialogModes.NO
              );
              return "success";
            } catch (error5) {
              throw new Error(
                "所有进入智能图层编辑模式的方法都失败了。错误信息: " +
                  error1.message +
                  ", " +
                  error2.message +
                  ", " +
                  error3.message +
                  ", " +
                  error4.message +
                  ", " +
                  error5.message
              );
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
    desc449.putUnitDouble(idHrzn, idRlt, 0.0); // 水平偏移设为0，让图片稍微向左移动
    var idVrtc = charIDToTypeID("Vrtc");
    desc449.putUnitDouble(idVrtc, idRlt, 0.0); // 垂直偏移设为0，让图片稍微向上移动
    desc448.putObject(idOfst, idOfst, desc449);
    executeAction(idPlc, desc448, DialogModes.NO);

    // 获取当前图层并检查尺寸
    var currentLayer = app.activeDocument.activeLayer;
    var layerWidth = currentLayer.bounds[2].value - currentLayer.bounds[0].value;
    var layerHeight = currentLayer.bounds[3].value - currentLayer.bounds[1].value;

    // 计算合适的缩放比例以铺满整个图层
    try {
      var scalePercent = calculateOptimalScale(4.76, layerHeight);
      scaleCurrentLayer(scalePercent);
    } catch (scaleError) {
      alert("缩放失败" + scaleError);
      try {
        scaleCurrentLayer(105);
      } catch (defaultScaleError) {
        // 如果默认缩放也失败，继续执行，不影响主要功能
      }
    }

    return "success";
  } catch (error) {
    return "error: " + error.message;
  }
}

// 退出智能图层编辑模式（改进版，保持文档上下文）
function exitSmartObjectEditMode(mainDocument) {
  try {
    // 保存当前智能图层编辑文档引用
    var smartObjectDoc = app.activeDocument;

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

      // 确保返回到主文档
      if (mainDocument) {
        app.activeDocument = mainDocument;
      }

      return "success";
    } catch (error1) {
      // 方法2：使用关闭文档命令
      try {
        smartObjectDoc.close(SaveOptions.SAVECHANGES);

        // 确保返回到主文档
        if (mainDocument) {
          app.activeDocument = mainDocument;
        }

        return "success";
      } catch (error2) {
        // 方法3：使用保存并关闭命令
        try {
          var desc = new ActionDescriptor();
          executeAction(stringIDToTypeID("save"), desc, DialogModes.NO);

          var desc2 = new ActionDescriptor();
          executeAction(stringIDToTypeID("close"), desc2, DialogModes.NO);

          // 确保返回到主文档
          if (mainDocument) {
            app.activeDocument = mainDocument;
          }

          return "success";
        } catch (error3) {
          // 最后尝试：直接关闭当前文档并返回主文档
          try {
            if (app.activeDocument) {
              app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
            }
            if (mainDocument) {
              app.activeDocument = mainDocument;
            }
            return "success";
          } catch (error4) {
            throw new Error(
              "所有退出智能图层编辑模式的方法都失败了。错误信息: " +
                error1.message +
                ", " +
                error2.message +
                ", " +
                error3.message +
                ", " +
                error4.message
            );
          }
        }
      }
    }
  } catch (error) {
    return "error: " + error.message;
  }
}

// 使用Place命令放置图片到智能图层
function placeImageInSmartObject(imagePath) {
  try {
    // 进入智能图层编辑模式
    var enterResult = enterSmartObjectEditMode();
    if (enterResult !== "success") {
      return "enter_failed: " + enterResult;
    }

    // 等待一下确保编辑模式已进入（减少等待时间）
    $.sleep(20);

    // 在编辑模式下放置图片
    var placeResult = placeImageInEditMode(imagePath);
    if (placeResult !== "success") {
      return "place_failed: " + placeResult;
    }

    // 保存并退出编辑模式
    var exitResult = exitSmartObjectEditMode();
    if (exitResult !== "success") {
      return "exit_failed: " + exitResult;
    }

    return "success";
  } catch (error) {
    return "error: " + error.message;
  }
}

//获取图层组并编辑其中的图层（使用Place命令放置图片）- 高性能模式
function getLayerSets(name, inputPath) {
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
    var processedCount = 0;

    for (var i = layerSets.length - 1; i >= 0; i--) {
      if (layerSets[i].name === name) {
        // 获取该图层组内所有图层
        var layers = layerSets[i].layers;
        var smartLayers = [];

        // 先收集所有智能图层，避免在循环中频繁切换
        for (var j = layers.length - 1; j >= 0; j--) {
          var layer = layers[j];

          // 检查是否为智能图层
          if (layer.kind === LayerKind.SMARTOBJECT) {
            smartLayers.push({
              layer: layer,
              name: layer.name,
              index: j,
            });
          }
        }

        // 批量处理智能图层
        for (var k = 0; k < smartLayers.length; k++) {
          var smartLayer = smartLayers[k];

          try {
            // 检查是否有对应的图片路径（快速检查）
            if (imageIndex >= imagePaths.length) {
              break;
            }

            // 保存主文档的引用
            var mainDoc = app.activeDocument;

            // 选中该图层并获取位置信息
            mainDoc.activeLayer = smartLayer.layer;
            var smartLayerBounds = smartLayer.layer.bounds;
            var targetPosition = {
              x: smartLayerBounds[0].value,
              y: smartLayerBounds[1].value,
              width: smartLayerBounds[2].value - smartLayerBounds[0].value,
              height: smartLayerBounds[3].value - smartLayerBounds[1].value,
            };

            // 在主文档中放置图片
            var placeResult = placeImageInEditMode(imagePaths[imageIndex++]);
            $.sleep(2);
            
            // 调整图片位置到对应的图层位置
            if (placeResult === "success") {
              try {
                // 获取当前放置的图片图层
                var placedLayer = app.activeDocument.activeLayer;

                // 先调整大小
                var percent = calculateOptimalScale(
                  IMAGE_WIDTH,
                  IMAGE_HEIGHT
                );
                $.sleep(2);

                scaleCurrentLayer(percent);
                $.sleep(2);

                // 使用translate方法移动到目标位置
                var deltaX = targetPosition.x - placedLayer.bounds[0].value;
                var deltaY = targetPosition.y - placedLayer.bounds[1].value;
                placedLayer.translate(deltaX, deltaY);
                $.sleep(2);

                // 将图层与智能图层合并
                var idGrpL = charIDToTypeID("GrpL");
                var desc474 = new ActionDescriptor();
                var idnull = charIDToTypeID("null");
                var ref177 = new ActionReference();
                var idLyr = charIDToTypeID("Lyr ");
                var idOrdn = charIDToTypeID("Ordn");
                var idTrgt = charIDToTypeID("Trgt");
                ref177.putEnumerated(idLyr, idOrdn, idTrgt);
                desc474.putReference(idnull, ref177);
                executeAction(idGrpL, desc474, DialogModes.NO);

                processedCount++;
              } catch (adjustError) {
                // 如果调整失败，继续处理下一个图层
                continue;
              }
            }
          } catch (editError) {
            // 如果编辑失败，继续处理下一个图层
            continue;
          }
        }

        foundGroups.push(
          "第" +
            (foundGroups.length + 1) +
            "个" +
            layerSets[i].name +
            " (成功处理: " +
            processedCount +
            "个智能图层)"
        );
      }
    }

    if (foundGroups.length > 0) {
      return "found: " + foundGroups.join(" | ");
    }
    return "not_found";
  } catch (error) {
    return "error: " + error.message;
  }
}


// 一键智能图层按钮功能 - 识别"组 1"图层组并将下面的图层全部转化为智能图层
function convertToSmartObjects() {
  try {
    if (app.documents.length === 0) {
      return "no_document";
    }

    var layerSets = app.activeDocument.layerSets;
    var targetGroup = null;
    var convertedCount = 0;

    // 查找名为"组 1"的图层组
    for (var i = 0; i < layerSets.length; i++) {
      if (layerSets[i].name === "组 1") {
        targetGroup = layerSets[i];
        break;
      }
    }

    if (!targetGroup) {
      return "group_not_found: 未找到名为'组 1'的图层组";
    }

    // 获取该图层组内所有图层
    var layers = targetGroup.layers;

    if (layers.length === 0) {
      return "no_layers_in_group: '组 1'图层组内没有图层";
    }

    // 处理每个图层，将其转换为智能图层
    for (var j = layers.length - 1; j >= 0; j--) {
      var layer = layers[j];

      try {
        // 检查是否已经是智能图层
        if (layer.kind === LayerKind.SMARTOBJECT) {
          continue; // 跳过已经是智能图层的图层
        }

        // 选中该图层
        app.activeDocument.activeLayer = layer;

        // 转换为智能图层
        var idnewPlacedLayer = stringIDToTypeID("newPlacedLayer");
        executeAction(idnewPlacedLayer, undefined, DialogModes.NO);

        // 等待创建完成
        $.sleep(30);

        convertedCount++;
      } catch (layerError) {
        // 如果某个图层转换失败，记录错误但继续处理其他图层
        break;
      }
    }

    if (convertedCount > 0) {
      return "success: 成功将 " + convertedCount + " 个图层转换为智能图层";
    } else {
      return "no_conversion: 没有需要转换的图层（可能都已经是智能图层了）";
    }
  } catch (error) {
    return "error: " + error.message;
  }
}

// 批量转换指定图层组为智能图层（通用版本）
function convertGroupToSmartObjects(groupName) {
  try {
    if (app.documents.length === 0) {
      return "no_document";
    }

    var layerSets = app.activeDocument.layerSets;
    var targetGroup = null;
    var convertedCount = 0;

    // 查找指定名称的图层组
    for (var i = 0; i < layerSets.length; i++) {
      if (layerSets[i].name === groupName) {
        targetGroup = layerSets[i];
        break;
      }
    }

    if (!targetGroup) {
      return "group_not_found: 未找到名为'" + groupName + "'的图层组";
    }

    // 获取该图层组内所有图层
    var layers = targetGroup.layers;

    if (layers.length === 0) {
      return "no_layers_in_group: '" + groupName + "'图层组内没有图层";
    }

    // 处理每个图层，将其转换为智能图层
    for (var j = layers.length - 1; j >= 0; j--) {
      var layer = layers[j];

      try {
        // 检查是否已经是智能图层
        if (layer.kind === LayerKind.SMARTOBJECT) {
          continue; // 跳过已经是智能图层的图层
        }

        // 选中该图层
        app.activeDocument.activeLayer = layer;

        // 使用invokeCommand命令转换为智能图层
        var idinvokeCommand = stringIDToTypeID("invokeCommand");
        var desc11 = new ActionDescriptor();
        var idcommandID = stringIDToTypeID("commandID");
        desc11.putInteger(idcommandID, 2980);
        var idkcanDispatchWhileModal = stringIDToTypeID(
          "kcanDispatchWhileModal"
        );
        desc11.putBoolean(idkcanDispatchWhileModal, true);
        executeAction(idinvokeCommand, desc11, DialogModes.NO);

        // 等待命令执行完成
        $.sleep(50);

        // 创建新的放置图层
        var idnewPlacedLayer = stringIDToTypeID("newPlacedLayer");
        executeAction(idnewPlacedLayer, undefined, DialogModes.NO);

        // 等待创建完成
        $.sleep(30);

        convertedCount++;
      } catch (layerError) {
        // 如果某个图层转换失败，记录错误但继续处理其他图层
        $.writeln("图层 '" + layer.name + "' 转换失败: " + layerError.message);
        continue;
      }
    }

    if (convertedCount > 0) {
      return "success: 成功将 " + convertedCount + " 个图层转换为智能图层";
    } else {
      return "no_conversion: 没有需要转换的图层（可能都已经是智能图层了）";
    }
  } catch (error) {
    return "error: " + error.message;
  }
}

// 一键重命名图层组功能 - 将"组 1"内的图层按倒序重命名为1组01、1组02...
function renameLayersInGroup() {
  try {
    if (app.documents.length === 0) {
      return "no_document";
    }

    var layerSets = app.activeDocument.layerSets;
    var targetGroup = null;
    var renamedCount = 0;

    // 查找名为"组 1"的图层组
    for (var i = 0; i < layerSets.length; i++) {
      if (layerSets[i].name === "组 1") {
        targetGroup = layerSets[i];
        break;
      }
    }

    if (!targetGroup) {
      return "group_not_found: 未找到名为'组 1'的图层组";
    }

    // 获取该图层组内所有图层
    var layers = targetGroup.layers;

    if (layers.length === 0) {
      return "no_layers_in_group: '组 1'图层组内没有图层";
    }

    var currentGroupNumber = 1; // 当前组号
    var currentLayerIndex = 0; // 当前组内图层索引 (1-配置数量)

    // 按倒序处理图层（从下到上）
    for (var j = layers.length - 1; j >= 0; j--) {
      var layer = layers[j];

      try {
        // 检查是否需要创建新组
        if (currentLayerIndex >= TEMPLATE_IMAGE_COUNT) {
          currentGroupNumber++;
          currentLayerIndex = 0;
        }

        // 生成新的图层名称（两位数格式：01、02、03...）
        var layerNumber = currentLayerIndex + 1;
        var newName =
          currentGroupNumber +
          "组" +
          (layerNumber < 10 ? "0" + layerNumber : layerNumber.toString());

        // 重命名图层
        layer.name = newName;

        renamedCount++;
        currentLayerIndex++;
      } catch (layerError) {
        // 如果某个图层重命名失败，记录错误但继续处理其他图层
        currentLayerIndex++;
        continue;
      }
    }

    if (renamedCount > 0) {
      return (
        "success: 成功重命名 " +
        renamedCount +
        " 个图层，使用了 " +
        currentGroupNumber +
        " 个组"
      );
    } else {
      return "no_rename: 没有图层被重命名";
    }
  } catch (error) {
    return "error: " + error.message;
  }
}

// 渲染操作
function renderNestedFolderImagesNew(layerMappingData) {
  try {
    if (app.documents.length === 0) {
      return "no_document";
    }

    // 解析传入的字符串为对象（ES3兼容）
    var parsedLayerMapping = {};
    if (typeof layerMappingData === "string") {
      try {
        // 简单的字符串解析
        var str = trim(layerMappingData);
        if (str.charAt(0) === "{" && str.charAt(str.length - 1) === "}") {
          str = str.substring(1, str.length - 1);
        }

        var pairs = str.split(",");
        for (var i = 0; i < pairs.length; i++) {
          var pair = trim(pairs[i]);
          if (pair === "") continue;

          var colonIndex = pair.indexOf(":");
          if (colonIndex === -1) continue;

          var key = trim(pair.substring(0, colonIndex));
          var value = trim(pair.substring(colonIndex + 1));

          // 移除引号
          if (key.charAt(0) === '"' && key.charAt(key.length - 1) === '"') {
            key = key.substring(1, key.length - 1);
          }
          if (
            value.charAt(0) === '"' &&
            value.charAt(value.length - 1) === '"'
          ) {
            value = value.substring(1, value.length - 1);
          }

          // 处理转义字符
          key = key.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
          value = value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");

          parsedLayerMapping[key] = value;
        }
        layerMappingData = parsedLayerMapping;
      } catch (parseError) {
        return "error: 解析图层映射数据失败: " + parseError.message;
      }
    }

    // 检查layerMappingData是否为空对象
    var hasData = false;
    for (var key in layerMappingData) {
      if (layerMappingData.hasOwnProperty(key)) {
        hasData = true;
        break;
      }
    }

    if (!hasData) {
      return "error: 图层映射数据为空";
    }

    // 查找"组 1"图层组
    var layerSets = app.activeDocument.layerSets;
    var targetGroup = null;

    for (var i = 0; i < layerSets.length; i++) {
      if (layerSets[i].name === "组 1") {
        targetGroup = layerSets[i];
        break;
      }
    }

    if (!targetGroup) {
      return "group_not_found: 组 1";
    }

    // 获取该图层组内所有图层
    var layers = targetGroup.layers;
    var smartLayers = [];
    var processedCount = 0;

    // 先收集所有智能图层
    for (var j = layers.length - 1; j >= 0; j--) {
      var layer = layers[j];

      // 检查是否为智能图层
      
        smartLayers.push({
          layer: layer,
          name: layer.name,
          index: j,
        });
      
    }

    // 批量处理智能图层
    for (var k = 0; k < smartLayers.length; k++) {
      var smartLayer = smartLayers[k];
      var layerName = smartLayer.name;

      // 检查是否在映射中存在对应的图片路径
      if (layerMappingData.hasOwnProperty(layerName)) {
        var imagePath = layerMappingData[layerName];

        try {
          // 保存主文档的引用
          var mainDoc = app.activeDocument;

          // 选中该图层并获取位置信息
          mainDoc.activeLayer = smartLayer.layer;
          var smartLayerBounds = smartLayer.layer.bounds;
          var targetPosition = {
            x: smartLayerBounds[0].value,
            y: smartLayerBounds[1].value,
            width: smartLayerBounds[2].value - smartLayerBounds[0].value,
            height: smartLayerBounds[3].value - smartLayerBounds[1].value,
          };

          // 在主文档中放置图片
          var placeResult = placeImageInEditMode(imagePath);
          $.sleep(2);
          // 调整图片位置到对应的图层位置
          if (placeResult === "success") {
            try {
              // 获取当前放置的图片图层
              var placedLayer = app.activeDocument.activeLayer;
              var width = new UnitValue(IMAGE_WIDTH, "cm");
              var height = new UnitValue(IMAGE_HEIGHT, "cm");
               // 先调整大小
               var percent = calculateOptimalScale(
                width,
                height
              );
               $.sleep(1)

               scaleCurrentLayer(percent);
               $.sleep(2)
              
               // 使用translate方法移动到目标位置
               var deltaX = targetPosition.x - placedLayer.bounds[0].value;
               var deltaY = targetPosition.y - placedLayer.bounds[1].value;
               placedLayer.translate(deltaX, deltaY);
               $.sleep(2)

               var idGrpL = charIDToTypeID("GrpL");
               var desc474 = new ActionDescriptor();
               var idnull = charIDToTypeID("null");
               var ref177 = new ActionReference();
               var idLyr = charIDToTypeID("Lyr ");
               var idOrdn = charIDToTypeID("Ordn");
               var idTrgt = charIDToTypeID("Trgt");
               ref177.putEnumerated(idLyr, idOrdn, idTrgt);
               desc474.putReference(idnull, ref177);
               executeAction(idGrpL, desc474, DialogModes.NO);

              processedCount++;
            } catch (adjustError) {
              // 如果调整失败，继续处理下一个图层
              alert(adjustError)
              break;
            }
          }
        } catch (processError) {
          // 如果处理失败，继续处理下一个图层
          continue;
        }
      }
    }

    // 构建结果消息
    var resultMessage =
      "新嵌套文件夹渲染完成! 成功处理了 " + processedCount + " 个智能图层";

    return "success: " + resultMessage;
  } catch (error) {
    return "error: " + error.message;
  }
}






