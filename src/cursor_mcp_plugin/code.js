// This is the main code file for the Cursor MCP MasterGo plugin
// It handles MasterGo API commands
// 这是 Cursor MCP MasterGo 插件的主代码文件
// 它处理 MasterGo API 命令

// Plugin state
// 插件状态
const state = {
  serverPort: 9509, // Default port 默认端口
  isConnected: false, // 是否连接到MCP
  isLoaded: false, // 插件是否已加载
};

// 初始化函数，确保插件正确加载
function initialize() {
  try {
    console.log("初始化MasterGo插件 - 版本 1.1.0");
    mg.notify("正在初始化MasterGo插件...");

    // 设置全局错误处理
    setupGlobalErrorHandling();

    // 设置标志
    state.isLoaded = true;

    // 初始化UI
    console.log("显示UI界面");
    mg.showUI(__html__, { width: 350, height: 450 });

    // 只进行基本API检查，不创建测试图形
    console.log("检查API基本可用性");
    const basicCheck = !!mg.document.currentPage && typeof mg.notify === 'function';
    console.log("基本API检查:", basicCheck ? "通过" : "失败");

    mg.notify("插件初始化完成");
    console.log("插件初始化完成");
    return true;
  } catch (error) {
    console.error("初始化失败:", error.message, "堆栈:", error.stack);
    mg.notify("插件初始化失败: " + error.message);
    return false;
  }
}

// 设置全局错误处理
function setupGlobalErrorHandling() {
  try {
    // 拦截未处理的Promise异常
    window.addEventListener('unhandledrejection', function (event) {
      console.error('未处理的Promise错误:', event.reason);
      mg.notify("捕获到未处理的异步错误: " + (event.reason.message || String(event.reason)));
    });

    // 拦截全局异常
    window.onerror = function (message, source, lineno, colno, error) {
      console.error('全局错误:', {
        message,
        source,
        lineno,
        colno,
        error: error ? error.stack : null
      });
      mg.notify("捕获到全局错误: " + message);
      return true; // 防止默认错误处理
    };

    console.log("全局错误处理已设置");
  } catch (error) {
    console.error("设置全局错误处理失败:", error);
  }
}

// 调用初始化
initialize();

// 完全按照官方文档示例处理消息
mg.ui.onmessage = async (msg, origin) => {
  try {
    console.log("收到UI消息:", JSON.stringify(msg));

    if (!msg) {
      console.error("收到空消息");
      return;
    }

    // 检查是否有命令
    if (msg.command) {
      console.log("执行命令:", msg.command);

      try {
        // 统一使用handleCommand处理所有命令
        const result = await handleCommand(msg.command, msg);
        console.log(`${msg.command}执行结果:`, JSON.stringify(result, null, 2));
        mg.notify(`${msg.command}执行成功!`);

        // 将结果返回给UI
        if (msg.id) {
          console.log(`返回结果给UI，ID: ${msg.id}`);
          mg.ui.postMessage({
            pluginMessage: {
              type: "command-result",
              id: msg.id,
              result: result
            }
          }, "*");
        } else {
          console.warn(`执行成功但无法返回结果，缺少ID: ${msg.command}`);
        }
      } catch (error) {
        console.error("执行命令失败:", error);
        mg.notify(`执行失败: ${error.message}`);

        // 返回错误给UI
        if (msg.id) {
          parent.postMessage({
            pluginMessage: {
              type: "command-error",
              id: msg.id,
              error: error.message
            }
          }, "*");
        }
      }
    } else if (msg.id && msg.result) {
      // 处理没有command字段但有id和result的消息（可能是广播消息或响应）
      console.log("收到结果消息:", JSON.stringify(msg));
      // 如果需要，可以在这里处理结果消息
      mg.ui.postMessage({
        pluginMessage: {
          type: "broadcast-result",
          id: msg.id,
          result: msg.result
        }
      }, "*");
    } else {
      console.warn("收到无效消息，缺少command字段:", JSON.stringify(msg));
      // 不再弹出通知，以免干扰用户体验
      // mg.notify("收到无效消息，缺少command字段");
    }
  } catch (error) {
    console.error("处理消息时发生错误:", error);
    mg.notify("处理消息时出错: " + error.message);
  }
};

// 命令处理器
async function handleCommand(command, params) {
  try {
    console.log(`处理命令: ${command}`, params);
    
    // 根据命令类型调用对应的处理函数
    switch (command) {
      case "get_document_info":
        return await getDocumentInfo();
      case "get_selection":
        return await getSelection();
      case "get_node_info":
        return await getNodeInfo(params.nodeId);
      case "create_rectangle":
        return await createRectangle(params);
      case "create_ellipse":
        return await createEllipse(params);
      case "create_circle":
        return await createCircle(params);
      case "create_frame":
        return await createFrame(params);
      case "create_text":
        return await createText(params);
      case "set_fill_color":
        return await setFillColor(params);
      case "set_stroke_color":
        return await setStrokeColor(params);
      case "move_node":
        return await moveNode(params);
      case "resize_node":
        return await resizeNode(params);
      case "delete_node":
        return await deleteNode(params);
      case "set_corner_radius":
        return await setCornerRadius(params);
      case "set_text_content":
        return await setTextContent(params);
      case "get_styles":
        return await getStyles();
      case "clone_node":
        return await cloneNode(params);
      case "set_font":
        return await setFont(params);
      case "get_team_components":
        return await getTeamLibraryAsync();
      case "import_component_by_key":
        return await importComponentByKey(params);
      case "import_component_set_by_key":
        return await importComponentSetByKey(params);
      case "import_style_by_key":
        return await importStyleByKey(params);
      case "create_component_instance":
        return await createInstance(params);
      case "get_component_properties":
        return await getComponentProperties(params);
      case "set_component_properties":
        return await setComponentProperties(params);
      case "add_component_property":
        return await addComponentProperty(params);
      case "edit_component_property":
        return await editComponentProperty(params);
      case "delete_component_property":
        return await deleteComponentProperty(params);
      case "set_component_property_references":
        return await setComponentPropertyReferences(params);
      case "get_variant_properties":
        return await getVariantProperties(params);
      case "set_variant_properties":
        return await setVariantProperties(params);
      case "append_child":
        return await appendChild(params);
      case "insert_child":
        return await insertChild(params);
      case "find_all":
        return await findAll(params);
      case "find_one":
        return await findOne(params);
      case "find_children":
        return await findChildren(params);
      case "find_all_with_criteria":
        return await findAllWithCriteria(params);
      case "get_children":
        return await getChildren(params);
      case "set_layout_mode":
        return await setLayoutMode(params);
      case "set_node_sizing_mode":
        return await setNodeSizingMode(params);
      default:
        console.error(`未知命令: ${command}`);
        throw new Error(`未知命令: ${command}`);
    }
  } catch (error) {
    console.error(`处理命令 ${command} 时出错:`, error);
    throw error;
  }
}

// 获取文档信息
async function getDocumentInfo() {
  try {
    console.log("开始获取极简文档信息");

    // 不再尝试加载页面，直接获取基本信息
    const hasCurrentPage = !!mg.document.currentPage;
    console.log("当前页面是否存在:", hasCurrentPage);

    // 构建最简单的文档信息
    const simpleInfo = {
      document: {
        available: hasCurrentPage,
        timestamp: Date.now(),
        apiVersion: "1.0"
      },
      documentId: hasCurrentPage ? (mg.document.currentPage.id || "unknown-id") : "not-available"
    };

    // 如果页面存在，添加一些基本信息
    if (hasCurrentPage) {
      try {
        simpleInfo.document.currentPage = {
          id: mg.document.currentPage.id || "unknown-id",
          name: mg.document.currentPage.name || "未命名页面"
        };

        // 尝试获取子节点数量，但不遍历子节点
        if (mg.document.currentPage.children) {
          simpleInfo.document.currentPage.childCount = mg.document.currentPage.children.length;
        }
      } catch (pageError) {
        console.warn("获取页面详情失败:", pageError.message);
        simpleInfo.document.pageError = pageError.message;
      }
    }

    console.log("极简文档信息获取成功:", JSON.stringify(simpleInfo, null, 2));
    return simpleInfo;
  } catch (error) {
    console.error("获取极简文档信息失败:", error.message);
    // 返回最基本的错误信息
    return {
      document: {
        error: error.message,
        available: false,
        timestamp: Date.now()
      },
      documentId: "error"
    };
  }
}

// 获取选择
async function getSelection() {
  try {
    return {
      selectionCount: mg.document.currentPage.selection.length,
      selection: mg.document.currentPage.selection.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type
      }))
    };
  } catch (error) {
    console.error("获取选择失败:", error);
    throw error;
  }
}

// 获取节点信息
async function getNodeInfo(nodeId) {
  try {
    const node = await mg.getNodeById(nodeId);
    if (!node) {
      throw new Error(`找不到节点: ${nodeId}`);
    }

    const info = {
      id: node.id,
      name: node.name,
      type: node.type
    };

    if ('x' in node) info.x = node.x;
    if ('y' in node) info.y = node.y;
    if ('width' in node) info.width = node.width;
    if ('height' in node) info.height = node.height;

    return info;
  } catch (error) {
    console.error("获取节点信息失败:", error);
    throw error;
  }
}

// 获取多个节点信息
async function getNodesInfo(nodeIds) {
  try {
    const nodes = await Promise.all(nodeIds.map(id => mg.getNodeById(id)));
    const validNodes = nodes.filter(node => node !== null);

    return validNodes.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
    }));
  } catch (error) {
    console.error("获取多个节点信息失败:", error);
    throw error;
  }
}
//获取团队组件库
async function getTeamLibraryAsync() {
  try {
    // 获取团队库数据
    const teamLibrary = await mg.getTeamLibraryAsync();

    // 处理并返回数据
    return {
      count: teamLibrary.length,
      teamLibrary: teamLibrary.map(library => ({
        name: library.name,
        id: library.id,
        componentCount: library.componentList.length,
        styleCount: library.style ?
          (library.style.paints.length +
            library.style.effects.length +
            library.style.texts.length +
            library.style.grids.length) : 0,
        components: library.componentList.map(component => ({
          id: component.id,
          name: component.name,
          ukey: component.ukey,
          description: component.description,
          type: component.type,
          width: component.width,
          height: component.height
        }))
      }))
    };
  } catch (error) {
    console.error("获取团队组件库失败:", error);
    throw new Error(`获取团队组件库失败: ${error.message}`);
  }
}
// 创建矩形
async function createRectangle(params) {
  try {
    console.log("创建矩形，参数:", JSON.stringify(params));

    const {
      x = 0,
      y = 0,
      width = 100,
      height = 100,
      name = "矩形",
      fillColor,
      parentId
    } = params || {};

    // 创建矩形
    const rectangle = mg.createRectangle();
    console.log("rectangle", rectangle);

    // 设置基本属性
    rectangle.x = x;
    rectangle.y = y;
    // rectangle.resize(width, height);
    rectangle.width = width;
    rectangle.height = height;
    rectangle.name = name;

    // 设置填充色
    if (fillColor) {
      rectangle.fills = [{
        type: "SOLID",
        color: {
          r: parseFloat(fillColor.r) || 0,
          g: parseFloat(fillColor.g) || 0,
          b: parseFloat(fillColor.b) || 0
        },
        opacity: parseFloat(fillColor.a !== undefined ? fillColor.a : 1)
      }];
    }

    // 如果指定了父节点ID，则添加到父节点，否则添加到当前页面
    if (parentId) {
      const parentNode = await mg.getNodeById(parentId);
      if (!parentNode) {
        throw new Error(`找不到父节点: ${parentId}`);
      }
      parentNode.appendChild(rectangle);
      console.log(`已将矩形添加为节点${parentId}的子节点`);
    } else {
      // 添加到当前页面
      mg.document.currentPage.appendChild(rectangle);
    }

    console.log("矩形创建成功，ID:", rectangle.id);

    return {
      id: rectangle.id,
      name: rectangle.name,
      x: rectangle.x,
      y: rectangle.y,
      width: rectangle.width,
      height: rectangle.height
    };
  } catch (error) {
    console.error("创建矩形失败:", error);
    throw error;
  }
}

// 创建椭圆
async function createEllipse(params) {
  try {
    console.log("创建椭圆，参数:", JSON.stringify(params));

    const {
      x = 0,
      y = 0,
      width = 100,
      height = 100,
      name = "椭圆",
      fillColor,
      parentId
    } = params || {};

    // 创建椭圆
    const ellipse = mg.createEllipse();
    console.log("ellipse", ellipse);

    // 设置基本属性
    ellipse.x = x;
    ellipse.y = y;
    // ellipse.resize(width, height); // 注释掉这行
    ellipse.width = width; // 添加这行
    ellipse.height = height; // 添加这行
    ellipse.name = name;

    // 设置填充色
    if (fillColor) {
      ellipse.fills = [{
        type: "SOLID",
        color: {
          r: parseFloat(fillColor.r) || 0,
          g: parseFloat(fillColor.g) || 0,
          b: parseFloat(fillColor.b) || 0
        },
        opacity: parseFloat(fillColor.a !== undefined ? fillColor.a : 1)
      }];
    }

    // 如果指定了父节点ID，则添加到父节点，否则添加到当前页面
    if (parentId) {
      const parentNode = await mg.getNodeById(parentId);
      if (!parentNode) {
        throw new Error(`找不到父节点: ${parentId}`);
      }
      parentNode.appendChild(ellipse);
      console.log(`已将椭圆添加为节点${parentId}的子节点`);
    } else {
      // 添加到当前页面
      mg.document.currentPage.appendChild(ellipse);
    }

    console.log("椭圆创建成功，ID:", ellipse.id);

    return {
      id: ellipse.id,
      name: ellipse.name,
      x: ellipse.x,
      y: ellipse.y,
      width: ellipse.width,
      height: ellipse.height
    };
  } catch (error) {
    console.error("创建椭圆失败:", error);
    throw error;
  }
}

// 创建圆形
async function createCircle(params) {
  try {
    console.log("创建圆形，参数:", JSON.stringify(params));

    const {
      x = 0,
      y = 0,
      size = 100,
      name = "圆形",
      fillColor
    } = params || {};

    // 用椭圆创建圆形
    const circle = mg.createEllipse();

    // 设置基本属性
    circle.x = x;
    circle.y = y;
    circle.resize(size, size); // 宽高相等为圆形
    circle.name = name;

    // 设置填充色
    if (fillColor) {
      circle.fills = [{
        type: "SOLID",
        color: {
          r: parseFloat(fillColor.r) || 0,
          g: parseFloat(fillColor.g) || 0,
          b: parseFloat(fillColor.b) || 0
        },
        opacity: parseFloat(fillColor.a !== undefined ? fillColor.a : 1)
      }];
    }

    // 添加到当前页面
    mg.document.currentPage.appendChild(circle);

    console.log("圆形创建成功，ID:", circle.id);

    return {
      id: circle.id,
      name: circle.name,
      x: circle.x,
      y: circle.y,
      size: circle.width
    };
  } catch (error) {
    console.error("创建圆形失败:", error);
    throw error;
  }
}

// 创建框架
async function createFrame(params) {
  try {
    console.log("创建框架，参数:", JSON.stringify(params));

    const {
      x = 0,
      y = 0,
      width = 300,
      height = 200,
      name = "框架",
      fillColor,
      strokeColor,
      strokeWeight = 1,
      parentId
    } = params || {};

    // 创建框架
    const frame = mg.createFrame();

    // 设置基本属性
    frame.x = x;
    frame.y = y;
    //frame.resize(width, height);
    frame.width = width; // 添加这行
    frame.height = height; // 添加这行
    frame.name = name;
    // 设置填充色
    if (fillColor) {
      frame.fills = [{
        type: "SOLID",
        color: {
          r: parseFloat(fillColor.r) || 0,
          g: parseFloat(fillColor.g) || 0,
          b: parseFloat(fillColor.b) || 0
        },
        opacity: parseFloat(fillColor.a !== undefined ? fillColor.a : 1)
      }];
    }

    // 设置描边
    if (strokeColor) {
      frame.strokes = [{
        type: "SOLID",
        color: {
          r: parseFloat(strokeColor.r) || 0,
          g: parseFloat(strokeColor.g) || 0,
          b: parseFloat(strokeColor.b) || 0
        },
        opacity: parseFloat(strokeColor.a !== undefined ? strokeColor.a : 1)
      }];
      frame.strokeWeight = strokeWeight;
    }

    // 如果指定了父节点ID，则添加到父节点，否则添加到当前页面
    if (parentId) {
      const parentNode = await mg.getNodeById(parentId);
      if (!parentNode) {
        throw new Error(`找不到父节点: ${parentId}`);
      }
      parentNode.appendChild(frame);
      console.log(`已将框架添加为节点${parentId}的子节点`);
    } else {
      // 添加到当前页面
      mg.document.currentPage.appendChild(frame);
    }

    console.log("框架创建成功，ID:", frame.id);

    return {
      id: frame.id,
      name: frame.name,
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height
    };
  } catch (error) {
    console.error("创建框架失败:", error);
    throw error;
  }
}

// 创建文本
async function createText(params) {
  try {
    console.log("创建文本，参数:", JSON.stringify(params));

    const {
      x = 0,
      y = 0,
      text = "文本",
      fontSize = 14,
      fontWeight = 400,
      fontColor,
      name,
      parentId
    } = params || {};

    // 创建文本
    const textNode = mg.createText();
    textNode.characters = text;

    // 设置基本属性
    textNode.x = x;
    textNode.y = y;
    textNode.name = name || text.substring(0, 10) + (text.length > 10 ? "..." : "");

    // 设置字体大小和字重
    textNode.fontSize = fontSize;
    if (fontWeight) {
      textNode.fontWeight = fontWeight;
    }

    // 设置文本颜色
    if (fontColor) {
      textNode.fills = [{
        type: "SOLID",
        color: {
          r: parseFloat(fontColor.r) || 0,
          g: parseFloat(fontColor.g) || 0,
          b: parseFloat(fontColor.b) || 0
        },
        opacity: parseFloat(fontColor.a !== undefined ? fontColor.a : 1)
      }];
    }

    // 如果指定了父节点ID，则添加到父节点，否则添加到当前页面
    if (parentId) {
      const parentNode = await mg.getNodeById(parentId);
      if (!parentNode) {
        throw new Error(`找不到父节点: ${parentId}`);
      }
      parentNode.appendChild(textNode);
      console.log(`已将文本添加为节点${parentId}的子节点`);
    } else {
      // 添加到当前页面
      mg.document.currentPage.appendChild(textNode);
    }

    console.log("文本创建成功，ID:", textNode.id);

    return {
      id: textNode.id,
      name: textNode.name,
      x: textNode.x,
      y: textNode.y,
      text: textNode.characters
    };
  } catch (error) {
    console.error("创建文本失败:", error);
    throw error;
  }
}

// 设置填充颜色
async function setFillColor(params) {
  console.log("setFillColor", params);
  try {
    // const { nodeId, r = 0, g = 0, b = 0, a = 1 } = params;
    const { nodeId, color = {} } = params;
    const { r = 0, g = 0, b = 0, a = 1 } = color;

    if (!nodeId) {
      throw new Error("缺少nodeId参数");
    }

    const node = await mg.getNodeById(nodeId);
    console.log("node", node);
    if (!node) {
      throw new Error(`找不到节点: ${nodeId}`);
    }

    // 设置填充色
    node.fills = [{
      type: "SOLID",
      color: { r, g, b, a },
      opacity: a
    }];

    return {
      id: nodeId,
      fills: node.fills
    };
  } catch (error) {
    console.error("设置填充颜色失败:", error);
    throw error;
  }
}

// 设置描边颜色
async function setStrokeColor(params) {
  try {
    const { nodeId, r = 0, g = 0, b = 0, a = 1, weight } = params;

    if (!nodeId) {
      throw new Error("缺少nodeId参数");
    }

    const node = await mg.getNodeById(nodeId);
    if (!node) {
      throw new Error(`找不到节点: ${nodeId}`);
    }

    // 设置描边
    node.strokes = [{
      type: "SOLID",
      color: { r, g, b },
      opacity: a
    }];

    // 设置描边宽度
    if (weight !== undefined) {
      node.strokeWeight = weight;
    }

    return {
      id: node.id,
      strokes: node.strokes,
      strokeWeight: node.strokeWeight
    };
  } catch (error) {
    console.error("设置描边颜色失败:", error);
    throw error;
  }
}

// 移动节点
async function moveNode(params) {
  try {
    const { nodeId, x, y } = params;

    if (!nodeId) {
      throw new Error("缺少nodeId参数");
    }

    const node = await mg.getNodeById(nodeId);
    if (!node) {
      throw new Error(`找不到节点: ${nodeId}`);
    }

    // 设置位置
    if (x !== undefined) node.x = x;
    if (y !== undefined) node.y = y;

    return {
      id: node.id,
      x: node.x,
      y: node.y
    };
  } catch (error) {
    console.error("移动节点失败:", error);
    throw error;
  }
}

// 调整节点大小
async function resizeNode(params) {
  try {
    const { nodeId, width, height } = params;

    if (!nodeId) {
      throw new Error("缺少nodeId参数");
    }

    const node = await mg.getNodeById(nodeId);
    if (!node) {
      throw new Error(`找不到节点: ${nodeId}`);
    }

    // 调整大小
    if (width !== undefined) node.width = width;
    if (height !== undefined) node.height = height;

    return {
      id: node.id,
      width: node.width,
      height: node.height
    };
  } catch (error) {
    console.error("调整节点大小失败:", error);
    throw error;
  }
}

// 删除节点
async function deleteNode(params) {
  try {
    const { nodeId } = params;

    if (!nodeId) {
      throw new Error("缺少nodeId参数");
    }

    const node = await mg.getNodeById(nodeId);
    if (!node) {
      throw new Error(`找不到节点: ${nodeId}`);
    }

    // 删除节点
    node.remove();

    return {
      id: nodeId,
      success: true
    };
  } catch (error) {
    console.error("删除节点失败:", error);
    throw error;
  }
}

// 设置圆角
async function setCornerRadius(params) {
  try {
    const { nodeId, radius, corners } = params;
    console.log("接收到setCornerRadius", params);
    if (!nodeId) {
      throw new Error("缺少nodeId参数");
    }

    const node = await mg.getNodeById(nodeId);
    if (!node) {
      throw new Error(`找不到节点: ${nodeId}`);
    }

    // 设置圆角
    if (Array.isArray(corners) && corners.length === 4) {
      // 单独设置每个角
      // node.cornerRadius = {
      //   topLeft: corners[0] ? radius : 0,
      //   topRight: corners[1] ? radius : 0,
      //   bottomRight: corners[2] ? radius : 0,
      //   bottomLeft: corners[3] ? radius : 0
      // };
      node.topLeftRadius = corners[0] ? radius : 0;
      node.topRightRadius = corners[1] ? radius : 0;
      node.bottomRightRadius = corners[2] ? radius : 0;
      node.bottomLeftRadius = corners[3] ? radius : 0;
    } else {
      // 设置所有角
      node.cornerRadius = radius;
    }

    return {
      id: node.id,
      cornerRadius: node.cornerRadius
    };
  } catch (error) {
    console.error("设置圆角失败:", error);
    throw error;
  }
}

// 设置文本内容
async function setTextContent(params) {
  try {
    const { nodeId, text } = params;

    if (!nodeId) {
      throw new Error("缺少nodeId参数");
    }

    if (text === undefined) {
      throw new Error("缺少text参数");
    }

    const node = await mg.getNodeById(nodeId);
    if (!node) {
      throw new Error(`找不到节点: ${nodeId}`);
    }

    if (node.type !== "TEXT") {
      throw new Error(`节点不是文本类型: ${nodeId}`);
    }

    // 设置文本内容
    node.characters = text;

    return {
      id: node.id,
      text: node.characters
    };
  } catch (error) {
    console.error("设置文本内容失败:", error);
    throw error;
  }
}

// 获取样式
async function getStyles() {
  try {
    // 假设样式存储在某个地方
    const styles = {
      colors: await mg.getLocalPaintStylesAsync(),
      texts: await mg.getLocalTextStylesAsync(),
      effects: await mg.getLocalEffectStylesAsync(),
      grids: await mg.getLocalGridStylesAsync(),
    };

    return {
      colors: styles.colors.map((style) => ({
        id: style.id,
        name: style.name,
        key: style.key,
        paint: style.paints[0],
      })),
      texts: styles.texts.map((style) => ({
        id: style.id,
        name: style.name,
        key: style.key,
        fontSize: style.fontSize,
        fontName: style.fontName,
      })),
      effects: styles.effects.map((style) => ({
        id: style.id,
        name: style.name,
        key: style.key,
      })),
      grids: styles.grids.map((style) => ({
        id: style.id,
        name: style.name,
        key: style.key,
      })),
    };
  } catch (error) {
    console.error("获取样式失败:", error);
    throw error;
  }
}

// 克隆节点
async function cloneNode(params) {
  try {
    const { nodeId } = params;

    if (!nodeId) {
      throw new Error("缺少nodeId参数");
    }

    const node = await mg.getNodeById(nodeId);
    if (!node) {
      throw new Error(`找不到节点: ${nodeId}`);
    }

    const clonedNode = await node.clone(); // 伪代码，具体实现取决于API
    mg.document.currentPage.appendChild(clonedNode);

    return {
      id: clonedNode.id,
      success: true
    };
  } catch (error) {
    console.error("克隆节点失败:", error);
    throw error;
  }
}

// 设置字体样式
async function setFont(params) {
  try {
    const { nodeId, fontName, fontSize, fontWeight, start, end } = params;

    // 获取节点
    const node = await mg.getNodeById(nodeId);
    if (!node) {
      throw new Error(`找不到节点: ${nodeId}`);
    }

    // 确保节点是文本类型
    if (node.type !== 'TEXT') {
      throw new Error(`节点不是文本类型: ${nodeId}`);
    }

    console.log("设置字体前的文本样式:", node.textStyles ? JSON.stringify(Array.from(node.textStyles)) : "无样式信息");
    console.log("节点原始属性:", {
      fontSize: node.fontSize,
      fontWeight: node.fontWeight,
      fontName: node.fontName
    });

    // 处理fontName格式
    if (fontName) {
      let fontObj = fontName;
      if (typeof fontName === 'string') {
        fontObj = { family: fontName, style: "Regular" };
      }

      // 确保字体对象有必要属性
      if (!fontObj.family) {
        throw new Error("缺少字体family属性");
      }
      if (!fontObj.style) {
        fontObj.style = "Regular";
      }

      console.log(`准备设置字体: ${fontObj.family} ${fontObj.style}`);

      // 加载字体 - 在设置字体前必须先加载
      await mg.loadFontAsync(fontObj);
      console.log("字体加载成功，开始设置");

      // 设置字体
      if (start !== undefined && end !== undefined) {
        // 设置部分文本的字体
        console.log(`设置文本 ${start} 到 ${end} 的字体为 ${fontObj.family} ${fontObj.style}`);
        node.setRangeFontName(start, end, fontObj);
      } else if (start !== undefined) {
        // 从start到文本结尾
        const textEnd = node.characters.length;
        console.log(`设置文本 ${start} 到 ${textEnd} 的字体为 ${fontObj.family} ${fontObj.style}`);
        node.setRangeFontName(start, textEnd, fontObj);
      } else {
        // 设置整个文本的字体
        console.log(`设置整个文本的字体为 ${fontObj.family} ${fontObj.style}`);
        node.fontName = fontObj;
      }
    }

    // 设置字号
    if (fontSize !== undefined) {
      if (start !== undefined && end !== undefined) {
        // 设置指定范围的文本字号
        console.log(`设置文本 ${start} 到 ${end} 的字号为 ${fontSize}`);
        node.setRangeFontSize(start, end, fontSize);
      } else if (start !== undefined) {
        // 如果只提供了start参数，设置从start到文本结尾
        const textEnd = node.characters.length;
        console.log(`设置文本 ${start} 到 ${textEnd} 的字号为 ${fontSize}`);
        node.setRangeFontSize(start, textEnd, fontSize);
      } else {
        // 设置整个文本的字号
        console.log(`设置整个文本的字号为 ${fontSize}`);
        node.fontSize = fontSize;
      }
    }

    // 设置字体粗细 - 尝试多种方法
    if (fontWeight !== undefined) {
      console.log(`尝试设置字重: ${fontWeight}, 类型: ${typeof fontWeight}`);

      const weightValue = parseInt(fontWeight, 10);
      console.log(`解析后的字重值: ${weightValue}`);

      // 检查节点当前的属性
      console.log("API可用方法探测:");
      const nodeProps = Object.getOwnPropertyNames(node);
      console.log("- 节点属性:", nodeProps.filter(p => typeof node[p] !== 'function').slice(0, 20));
      console.log("- 节点方法:", nodeProps.filter(p => typeof node[p] === 'function').slice(0, 20));

      // 直接探测字体相关属性
      for (const prop of nodeProps) {
        if (prop.toLowerCase().includes('weight') || prop.toLowerCase().includes('font')) {
          console.log(`- 探测到字体相关属性: ${prop}=${node[prop]}`);
        }
      }

      // 尝试方法1: 直接设置fontWeight属性
      try {
        console.log("尝试方法1: 直接设置node.fontWeight");
        const oldWeight = node.fontWeight;
        node.fontWeight = weightValue;
        console.log(`字重从 ${oldWeight} 变更为 ${node.fontWeight}`);
      } catch (e) {
        console.error("直接设置fontWeight失败:", e);
      }

      // 尝试方法2: 使用setRangeFontWeight (如果可用)
      if (typeof node.setRangeFontWeight === 'function') {
        try {
          console.log("尝试方法2: 使用setRangeFontWeight");
          if (start !== undefined && end !== undefined) {
            node.setRangeFontWeight(start, end, weightValue);
          } else {
            node.setRangeFontWeight(0, node.characters.length, weightValue);
          }
        } catch (e) {
          console.error("setRangeFontWeight失败:", e);
        }
      } else {
        console.log("setRangeFontWeight方法不可用");
      }

      // 尝试方法3: 扫描当前字体使用样式来查找更粗的字体变体
      try {
        console.log("尝试方法3: 探索字体粗细变体");
        if (node.fontName && node.fontName.family) {
          // 尝试匹配常见的粗细变体名称
          const fontFamily = node.fontName.family;
          let newStyle = 'Regular';

          if (weightValue >= 700) {
            newStyle = 'Bold';
          } else if (weightValue >= 600) {
            newStyle = 'SemiBold';
          } else if (weightValue >= 500) {
            newStyle = 'Medium';
          } else if (weightValue <= 300) {
            newStyle = 'Light';
          }

          console.log(`尝试加载并设置字体变体: ${fontFamily} ${newStyle}`);
          const fontObj = { family: fontFamily, style: newStyle };

          try {
            await mg.loadFontAsync(fontObj);

            if (start !== undefined && end !== undefined) {
              node.setRangeFontName(start, end, fontObj);
            } else {
              node.fontName = fontObj;
            }

            console.log(`成功设置字体变体: ${fontFamily} ${newStyle}`);
          } catch (e) {
            console.error(`加载字体变体 ${fontFamily} ${newStyle} 失败:`, e);
          }
        }
      } catch (e) {
        console.error("尝试字体变体探索失败:", e);
      }
    }

    // 等待一下让字体变化生效
    await new Promise(resolve => setTimeout(resolve, 100));

    // 记录操作后的文本样式
    const textStylesAfter = node.textStyles ? Array.from(node.textStyles) : [];
    console.log("操作后文本样式:", JSON.stringify(textStylesAfter));
    console.log("操作后节点属性:", {
      fontSize: node.fontSize,
      fontWeight: node.fontWeight,
      fontName: node.fontName
    });

    return {
      id: node.id,
      name: node.name,
      fontName: fontName,
      fontSize: fontSize,
      fontWeight: fontWeight,
      range: start !== undefined ? { start, end: end || node.characters.length } : "全部文本",
      textStyles: textStylesAfter.map(style => ({
        start: style.start,
        end: style.end,
        textStyleId: style.textStyleId || '',
        textStyle: {
          fontSize: style.textStyle.fontSize,
          fontName: style.textStyle.fontName,
          fontWeight: style.textStyle.fontWeight
        }
      }))
    };
  } catch (error) {
    console.error("设置字体失败:", error);
    throw error;
  }
}

// 导入组件
async function importComponentByKey(params) {
  try {
    const { ukey, properties, x = 0, y = 0, parentId } = params;

    if (!ukey) {
      throw new Error("缺少ukey参数");
    }

    console.log("准备导入组件，ukey:", ukey);
    console.log("父节点", parentId)

    // 导入组件
    const componentNode = await mg.importComponentByKeyAsync(ukey);
    console.log("组件导入成功:", componentNode.id, componentNode.name);

    // 创建实例
    const instance = componentNode.createInstance();
    console.log("实例创建成功:", instance.id, instance.name);

    // 如果指定了父节点ID，则添加到父节点，否则添加到当前页面
    if (parentId) {
      const parentNode = await mg.getNodeById(parentId);
      if (!parentNode) {
        throw new Error(`找不到父节点: ${parentId}`);
      }
      parentNode.appendChild(instance);
      console.log(`已将实例添加为节点${parentId}的子节点`);
    } else {
      // 添加到当前页面
      mg.document.currentPage.appendChild(instance);
      console.log("实例已添加到页面");
    }

    // 设置位置
    if (x !== undefined) instance.x = x;
    if (y !== undefined) instance.y = y;

    // 如果提供了属性，则尝试设置
    if (properties && typeof properties === 'object') {
      console.log("尝试设置实例属性:", JSON.stringify(properties));

      // 获取当前属性列表，以便稍后验证
      const beforeProps = instance.componentProperties ?
        instance.componentProperties.map(p => ({ id: p.id, value: p.value })) : [];
      console.log("设置前的属性:", JSON.stringify(beforeProps));

      // 检查MasterGo API中可能存在的实例属性设置方法
      try {
        // 如果组件有显式定义的组件属性方法:
        for (const key in instance) {
          if (key.toLowerCase().includes('property') || key.toLowerCase().includes('prop')) {
            console.log(`发现可能的属性相关方法/属性: ${key}`, typeof instance[key]);
          }
        }

        // 检查原型链中的方法
        const proto = Object.getPrototypeOf(instance);
        for (const key in proto) {
          if (key.toLowerCase().includes('property') || key.toLowerCase().includes('prop')) {
            console.log(`原型链中的属性相关方法: ${key}`, typeof proto[key]);
          }
        }
      } catch (err) {
        console.error("API分析错误:", err.message);
      }

      // 尝试方法1: 直接调用setProperties (MasterGo官方文档中的方法)
      try {
        console.log("尝试方法1: instance.setProperties");
        if (typeof instance.setProperties === 'function') {
          instance.setProperties(properties);
          console.log("setProperties方法调用成功");
        } else {
          console.log("实例上没有setProperties方法");
        }
      } catch (err) {
        console.error("setProperties方法错误:", err.message);
      }

      // 尝试方法2: 尝试执行MasterGo脚本
      try {
        console.log("尝试方法2: 执行MasterGo脚本");

        // 使用evalScriptAsync在MasterGo环境中执行脚本，确保脚本在正确的上下文中运行
        const scriptResult = await mg.evalScriptAsync(`
          (function() {
            try {
              // 确保实例存在
              const node = mg.getNodeById("${instance.id}");
              if (!node) return { success: false, error: "找不到实例" };
              
              // 打印节点类型
              const nodeType = node.type;
              
              // 检查节点是否有属性
              const hasProps = !!node.componentProperties;
              const propsCount = hasProps ? node.componentProperties.length : 0;
              
              // 调试信息
              const debug = {
                nodeType,
                hasProperties: hasProps,
                propsCount,
                methods: Object.getOwnPropertyNames(node).filter(name => typeof node[name] === 'function'),
                propsBeforeUpdate: hasProps ? JSON.stringify(node.componentProperties) : "无"
              };
              
              // 尝试方法1: setProperties
              let setPropsResult = "未执行";
              if (typeof node.setProperties === 'function') {
                try {
                  // 创建要设置的属性对象
                  const propsToSet = ${JSON.stringify(properties)};
                  node.setProperties(propsToSet);
                  setPropsResult = "成功执行setProperties";
                } catch(e) {
                  setPropsResult = "setProperties失败: " + e.message;
                }
              } else {
                setPropsResult = "node.setProperties不是函数";
              }
              
              // 尝试方法2: 直接修改componentProperties
              let directEditResult = "未执行";
              if (hasProps) {
                try {
                  const propsIds = Object.keys(${JSON.stringify(properties)});
                  let updatedProps = 0;
                  
                  for (let i = 0; i < node.componentProperties.length; i++) {
                    const prop = node.componentProperties[i];
                    if (propsIds.includes(prop.id)) {
                      const newValue = ${JSON.stringify(properties)}[prop.id];
                      prop.value = newValue;
                      updatedProps++;
                    }
                  }
                  
                  directEditResult = updatedProps > 0 ? 
                    "成功修改" + updatedProps + "个属性" : 
                    "没有找到匹配的属性ID";
                } catch(e) {
                  directEditResult = "直接修改失败: " + e.message;
                }
              } else {
                directEditResult = "节点没有componentProperties";
              }
              
              // 检查属性是否已更新
              const propsAfterUpdate = hasProps ? 
                JSON.stringify(node.componentProperties) : "无";
              
              return { 
                success: true, 
                debug,
                setPropsResult, 
                directEditResult,
                propsAfterUpdate 
              };
            } catch(e) {
              return { success: false, error: e.message };
            }
          })()
        `);
        console.log("MasterGo脚本执行结果:", scriptResult);
      } catch (err) {
        console.error("MasterGo脚本执行失败:", err.message);
      }
    }

    // 获取最终的组件属性状态
    const finalProps = instance.componentProperties || [];
    console.log("最终实例属性:", JSON.stringify(finalProps));

    console.log("导入过程完成");
    return {
      id: instance.id,
      name: instance.name,
      componentId: componentNode.id,
      properties: finalProps
    };
  } catch (error) {
    console.error("导入组件失败:", error);
    throw error;
  }
}

// 导入组件集
async function importComponentSetByKey(params) {
  try {
    const { ukey, parentId } = params;

    if (!ukey) {
      throw new Error("缺少ukey参数");
    }

    const componentSetNode = await mg.importComponentSetByKeyAsync(ukey);

    // 获取第一个子组件
    if (componentSetNode.children && componentSetNode.children.length > 0) {
      const childComponent = componentSetNode.children[0];
      const instance = childComponent.createInstance();

      // 如果指定了父节点ID，则添加到父节点，否则添加到当前页面
      if (parentId) {
        const parentNode = await mg.getNodeById(parentId);
        if (!parentNode) {
          throw new Error(`找不到父节点: ${parentId}`);
        }
        parentNode.appendChild(instance);
        console.log(`已将组件集实例添加为节点${parentId}的子节点`);
      } else {
        // 添加到当前页面
        mg.document.currentPage.appendChild(instance);
        console.log("组件集实例已添加到页面");
      }

      return {
        id: instance.id,
        name: instance.name,
        componentSetId: componentSetNode.id,
        childComponentId: childComponent.id
      };
    } else {
      throw new Error("组件集中没有子组件");
    }
  } catch (error) {
    console.error("导入组件集失败:", error);
    throw error;
  }
}

// 导入样式
async function importStyleByKey(params) {
  try {
    const { ukey, nodeId } = params;

    if (!ukey) {
      throw new Error("缺少ukey参数");
    }

    // 导入样式
    const importedStyle = await mg.importStyleByKeyAsync(ukey);
    console.log("导入样式成功:", importedStyle);

    // 如果提供了节点ID，则应用样式
    if (nodeId) {
      const node = await mg.getNodeById(nodeId);
      if (!node) {
        throw new Error(`找不到节点: ${nodeId}`);
      }

      // 根据样式类型应用样式
      if (importedStyle.type === 'PAINT') {
        node.fillStyleId = importedStyle.id;
      } else if (importedStyle.type === 'EFFECT') {
        node.effectStyleId = importedStyle.id;
      } else if (importedStyle.type === 'TEXT') {
        if (node.type === 'TEXT') {
          node.textStyleId = importedStyle.id;
        } else {
          throw new Error("文本样式只能应用于文本节点");
        }
      } else if (importedStyle.type === 'GRID') {
        node.gridStyleId = importedStyle.id;
      }
      console.log("应用样式到节点成功:", nodeId);
    }

    return {
      key: importedStyle.key,
      name: importedStyle.name,
      type: importedStyle.type
    };
  } catch (error) {
    console.error("导入样式失败:", error);
    throw new Error(`导入样式失败: ${error.message}`);
  }
}

// 创建组件实例
async function createInstance(params) {
  try {
    const { componentKey, x = 0, y = 0, parentId, properties } = params;

    console.log("创建组件实例，参数:", JSON.stringify(params));

    // 获取组件
    const component = await mg.getNodeById(componentKey);
    if (!component) {
      throw new Error(`找不到组件: ${componentKey}`);
    }

    // 创建实例
    const instance = component.createInstance();
    console.log("实例创建成功:", instance.id, instance.name);

    // 如果指定了父节点ID，则添加到父节点，否则添加到当前页面
    if (parentId) {
      const parentNode = await mg.getNodeById(parentId);
      if (!parentNode) {
        throw new Error(`找不到父节点: ${parentId}`);
      }
      parentNode.appendChild(instance);
      console.log(`已将实例添加为节点${parentId}的子节点`);
    } else {
      // 添加到当前页面
      mg.document.currentPage.appendChild(instance);
      console.log("实例已添加到页面");
    }

    // 设置位置
    if (x !== undefined) instance.x = x;
    if (y !== undefined) instance.y = y;

    // 如果提供了属性，则尝试设置
    if (properties && typeof properties === 'object') {
      console.log("尝试设置实例属性:", JSON.stringify(properties));

      // 获取当前属性列表，以便稍后验证
      const beforeProps = instance.componentProperties ?
        instance.componentProperties.map(p => ({ id: p.id, value: p.value })) : [];
      console.log("设置前的属性:", JSON.stringify(beforeProps));

      // 检查MasterGo API中可能存在的实例属性设置方法
      try {
        // 如果组件有显式定义的组件属性方法:
        for (const key in instance) {
          if (key.toLowerCase().includes('property') || key.toLowerCase().includes('prop')) {
            console.log(`发现可能的属性相关方法/属性: ${key}`, typeof instance[key]);
          }
        }

        // 检查原型链中的方法
        const proto = Object.getPrototypeOf(instance);
        for (const key in proto) {
          if (key.toLowerCase().includes('property') || key.toLowerCase().includes('prop')) {
            console.log(`原型链中的属性相关方法: ${key}`, typeof proto[key]);
          }
        }
      } catch (err) {
        console.error("API分析错误:", err.message);
      }

      // 尝试方法1: 直接调用setProperties (MasterGo官方文档中的方法)
      try {
        console.log("尝试方法1: instance.setProperties");
        if (typeof instance.setProperties === 'function') {
          instance.setProperties(properties);
          console.log("setProperties方法调用成功");
        } else {
          console.log("实例上没有setProperties方法");
        }
      } catch (err) {
        console.error("setProperties方法错误:", err.message);
      }

      // 尝试方法2: 尝试执行MasterGo脚本
      try {
        console.log("尝试方法2: 执行MasterGo脚本");

        // 使用evalScriptAsync在MasterGo环境中执行脚本，确保脚本在正确的上下文中运行
        const scriptResult = await mg.evalScriptAsync(`
          (function() {
            try {
              // 确保实例存在
              const node = mg.getNodeById("${instance.id}");
              if (!node) return { success: false, error: "找不到实例" };
              
              // 打印节点类型
              const nodeType = node.type;
              
              // 检查节点是否有属性
              const hasProps = !!node.componentProperties;
              const propsCount = hasProps ? node.componentProperties.length : 0;
              
              // 调试信息
              const debug = {
                nodeType,
                hasProperties: hasProps,
                propsCount,
                methods: Object.getOwnPropertyNames(node).filter(name => typeof node[name] === 'function'),
                propsBeforeUpdate: hasProps ? JSON.stringify(node.componentProperties) : "无"
              };
              
              // 尝试方法1: setProperties
              let setPropsResult = "未执行";
              if (typeof node.setProperties === 'function') {
                try {
                  // 创建要设置的属性对象
                  const propsToSet = ${JSON.stringify(properties)};
                  node.setProperties(propsToSet);
                  setPropsResult = "成功执行setProperties";
                } catch(e) {
                  setPropsResult = "setProperties失败: " + e.message;
                }
              } else {
                setPropsResult = "node.setProperties不是函数";
              }
              
              // 尝试方法2: 直接修改componentProperties
              let directEditResult = "未执行";
              if (hasProps) {
                try {
                  const propsIds = Object.keys(${JSON.stringify(properties)});
                  let updatedProps = 0;
                  
                  for (let i = 0; i < node.componentProperties.length; i++) {
                    const prop = node.componentProperties[i];
                    if (propsIds.includes(prop.id)) {
                      const newValue = ${JSON.stringify(properties)}[prop.id];
                      prop.value = newValue;
                      updatedProps++;
                    }
                  }
                  
                  directEditResult = updatedProps > 0 ? 
                    "成功修改" + updatedProps + "个属性" : 
                    "没有找到匹配的属性ID";
                } catch(e) {
                  directEditResult = "直接修改失败: " + e.message;
                }
              } else {
                directEditResult = "节点没有componentProperties";
              }
              
              // 检查属性是否已更新
              const propsAfterUpdate = hasProps ? 
                JSON.stringify(node.componentProperties) : "无";
              
              return { 
                success: true, 
                debug,
                setPropsResult, 
                directEditResult,
                propsAfterUpdate 
              };
            } catch(e) {
              return { success: false, error: e.message };
            }
          })()
        `);
        console.log("MasterGo脚本执行结果:", scriptResult);
      } catch (err) {
        console.error("MasterGo脚本执行失败:", err.message);
      }
    }

    // 获取最终的组件属性状态
    const finalProps = instance.componentProperties || [];
    console.log("最终实例属性:", JSON.stringify(finalProps));

    return {
      id: instance.id,
      name: instance.name,
      componentId: component.id,
      properties: finalProps
    };
  } catch (error) {
    console.error("创建组件实例失败:", error);
    throw error;
  }
}

// 获取组件属性
async function getComponentProperties(params) {
  try {
    const { nodeId } = params;

    if (!nodeId) {
      throw new Error("缺少nodeId参数");
    }

    const component = await mg.getNodeById(nodeId);
    if (!component) {
      throw new Error(`找不到组件: ${nodeId}`);
    }

    const properties = component.componentProperties || [];
    console.log("获取组件属性成功:", JSON.stringify(properties));

    return {
      nodeId,
      properties: properties.map(prop => ({
        id: prop.id,
        value: prop.value
      }))
    };
  } catch (error) {
    console.error("获取组件属性失败:", error);
    throw error;
  }
}

// 设置组件属性
async function setComponentProperties(params) {
  try {
    const { nodeId, properties } = params;

    if (!nodeId) {
      throw new Error("缺少instanceId参数");
    }

    if (!properties || typeof properties !== 'object') {
      throw new Error("缺少有效的properties参数");
    }

    const instance = await mg.getNodeById(nodeId);
    if (!instance) {
      throw new Error(`找不到实例: ${nodeId}`);
    }

    // 设置实例属性
    instance.setProperties(properties);
    console.log("设置实例属性成功:", JSON.stringify(properties));

    return {
      nodeId,
      success: true
    };
  } catch (error) {
    console.error("设置实例属性失败:", error);
    throw error;
  }
}

// 添加组件属性
async function addComponentProperty(params) {
  try {
    const { componentId, property } = params;

    if (!componentId) {
      throw new Error("缺少componentId参数");
    }

    if (!property || typeof property !== 'object') {
      throw new Error("缺少有效的property参数");
    }

    const component = await mg.getNodeById(componentId);
    if (!component) {
      throw new Error(`找不到组件: ${componentId}`);
    }

    // 添加组件属性
    component.addProperty(property);
    console.log("添加组件属性成功:", JSON.stringify(property));

    return {
      componentId,
      success: true
    };
  } catch (error) {
    console.error("添加组件属性失败:", error);
    throw error;
  }
}

// 编辑组件属性
async function editComponentProperty(params) {
  try {
    const { componentId, propertyId, newValue } = params;

    if (!componentId) {
      throw new Error("缺少componentId参数");
    }

    if (!propertyId) {
      throw new Error("缺少propertyId参数");
    }

    if (newValue === undefined) {
      throw new Error("缺少newValue参数");
    }

    const component = await mg.getNodeById(componentId);
    if (!component) {
      throw new Error(`找不到组件: ${componentId}`);
    }

    // 获取当前属性
    const currentProperty = component.getProperty(propertyId);
    if (!currentProperty) {
      throw new Error(`找不到属性: ${propertyId}`);
    }

    // 编辑属性
    currentProperty.value = newValue;
    console.log("编辑组件属性成功:", JSON.stringify({
      componentId,
      propertyId,
      newValue
    }));

    return {
      componentId,
      propertyId,
      success: true
    };
  } catch (error) {
    console.error("编辑组件属性失败:", error);
    throw error;
  }
}

// 删除组件属性
async function deleteComponentProperty(params) {
  try {
    const { componentId, propertyId } = params;

    if (!componentId) {
      throw new Error("缺少componentId参数");
    }

    if (!propertyId) {
      throw new Error("缺少propertyId参数");
    }

    const component = await mg.getNodeById(componentId);
    if (!component) {
      throw new Error(`找不到组件: ${componentId}`);
    }

    // 删除组件属性
    component.removeProperty(propertyId);
    console.log("删除组件属性成功:", JSON.stringify({
      componentId,
      propertyId
    }));

    return {
      componentId,
      propertyId,
      success: true
    };
  } catch (error) {
    console.error("删除组件属性失败:", error);
    throw error;
  }
}

// 设置组件属性引用
async function setComponentPropertyReferences(params) {
  try {
    const { componentId, propertyId, referencedComponentId } = params;

    if (!componentId) {
      throw new Error("缺少componentId参数");
    }

    if (!propertyId) {
      throw new Error("缺少propertyId参数");
    }

    if (!referencedComponentId) {
      throw new Error("缺少referencedComponentId参数");
    }

    const component = await mg.getNodeById(componentId);
    if (!component) {
      throw new Error(`找不到组件: ${componentId}`);
    }

    const referencedComponent = await mg.getNodeById(referencedComponentId);
    if (!referencedComponent) {
      throw new Error(`找不到引用组件: ${referencedComponentId}`);
    }

    // 设置组件属性引用
    component.setReference(propertyId, referencedComponent);
    console.log("设置组件属性引用成功:", JSON.stringify({
      componentId,
      propertyId,
      referencedComponentId
    }));

    return {
      componentId,
      propertyId,
      referencedComponentId,
      success: true
    };
  } catch (error) {
    console.error("设置组件属性引用失败:", error);
    throw error;
  }
}

// 获取变体属性
async function getVariantProperties(params) {
  try {
    const { componentId } = params;

    if (!componentId) {
      throw new Error("缺少componentId参数");
    }

    const component = await mg.getNodeById(componentId);
    if (!component) {
      throw new Error(`找不到组件: ${componentId}`);
    }

    const variantProperties = component.variantProperties || [];
    console.log("获取变体属性成功:", JSON.stringify(variantProperties));

    return {
      componentId,
      variantProperties: variantProperties.map(prop => ({
        id: prop.id,
        value: prop.value
      }))
    };
  } catch (error) {
    console.error("获取变体属性失败:", error);
    throw error;
  }
}

// 设置变体属性
async function setVariantProperties(params) {
  try {
    const { componentId, properties } = params;

    if (!componentId) {
      throw new Error("缺少componentId参数");
    }

    if (!properties || typeof properties !== 'object') {
      throw new Error("缺少有效的properties参数");
    }

    const component = await mg.getNodeById(componentId);
    if (!component) {
      throw new Error(`找不到组件: ${componentId}`);
    }

    // 设置变体属性
    component.setVariantProperties(properties);
    console.log("设置变体属性成功:", JSON.stringify(properties));

    return {
      componentId,
      success: true
    };
  } catch (error) {
    console.error("设置变体属性失败:", error);
    throw error;
  }
}

// 添加子节点
async function appendChild(params) {
  try {
    const { parentId, childId } = params;

    if (!parentId) {
      throw new Error("缺少parentId参数");
    }

    if (!childId) {
      throw new Error("缺少childId参数");
    }

    console.log(`正在添加子节点: 父节点ID=${parentId}, 子节点ID=${childId}`);

    // 获取父节点
    const parentNode = await mg.getNodeById(parentId);
    if (!parentNode) {
      throw new Error(`找不到父节点: ${parentId}`);
    }

    // 获取子节点
    const childNode = await mg.getNodeById(childId);
    if (!childNode) {
      throw new Error(`找不到子节点: ${childId}`);
    }

    // 验证父节点是否可以包含子节点
    if (!parentNode.appendChild) {
      throw new Error(`父节点 ${parentId} 不支持添加子节点`);
    }

    // 添加子节点
    parentNode.appendChild(childNode);
    console.log(`已成功将节点 ${childId} 添加为节点 ${parentId} 的子节点`);

    return {
      parentId,
      childId,
      success: true
    };
  } catch (error) {
    console.error("添加子节点失败:", error);
    throw error;
  }
}

// 插入子节点
async function insertChild(params) {
  try {
    const { parentId, childId, index } = params;

    if (!parentId) {
      throw new Error("缺少parentId参数");
    }

    if (!childId) {
      throw new Error("缺少childId参数");
    }

    if (index === undefined) {
      throw new Error("缺少index参数");
    }

    console.log(`正在插入子节点: 父节点ID=${parentId}, 子节点ID=${childId}, 索引=${index}`);

    // 获取父节点
    const parentNode = await mg.getNodeById(parentId);
    if (!parentNode) {
      throw new Error(`找不到父节点: ${parentId}`);
    }

    // 获取子节点
    const childNode = await mg.getNodeById(childId);
    if (!childNode) {
      throw new Error(`找不到子节点: ${childId}`);
    }

    // 验证父节点是否可以包含子节点
    if (!parentNode.insertChild) {
      throw new Error(`父节点 ${parentId} 不支持插入子节点`);
    }

    // 插入子节点
    parentNode.insertChild(index, childNode);
    console.log(`已成功将节点 ${childId} 插入到节点 ${parentId} 的索引 ${index} 位置`);

    return {
      parentId,
      childId,
      index,
      success: true
    };
  } catch (error) {
    console.error("插入子节点失败:", error);
    throw error;
  }
}

// 查找所有匹配节点
async function findAll(params) {
  try {
    const { nodeId, criteria } = params;

    if (!nodeId) {
      throw new Error("缺少nodeId参数");
    }

    console.log(`正在查找所有匹配节点: 起始节点ID=${nodeId}, 条件=`, criteria);

    // 获取起始节点
    const startNode = await mg.getNodeById(nodeId);
    if (!startNode) {
      throw new Error(`找不到起始节点: ${nodeId}`);
    }

    // 定义回调函数
    const callback = (node) => {
      // 如果没有条件，则返回所有节点
      if (!criteria) return true;

      // 如果有nodeType条件，检查节点类型
      if (criteria.nodeType && node.type !== criteria.nodeType) {
        return false;
      }

      // 如果有name条件，检查节点名称
      if (criteria.name && node.name !== criteria.name) {
        return false;
      }

      return true;
    };

    // 查找所有匹配节点
    const nodes = startNode.findAll(callback);

    // 转换为简单对象
    const result = nodes.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type
    }));

    console.log(`找到 ${result.length} 个匹配节点`);

    return result;
  } catch (error) {
    console.error("查找所有匹配节点失败:", error);
    throw error;
  }
}

// 查找第一个匹配节点
async function findOne(params) {
  try {
    const { nodeId, criteria } = params;

    if (!nodeId) {
      throw new Error("缺少nodeId参数");
    }

    console.log(`正在查找第一个匹配节点: 起始节点ID=${nodeId}, 条件=`, criteria);

    // 获取起始节点
    const startNode = await mg.getNodeById(nodeId);
    if (!startNode) {
      throw new Error(`找不到起始节点: ${nodeId}`);
    }

    // 定义回调函数
    const callback = (node) => {
      // 如果没有条件，则返回所有节点
      if (!criteria) return true;

      // 如果有nodeType条件，检查节点类型
      if (criteria.nodeType && node.type !== criteria.nodeType) {
        return false;
      }

      // 如果有name条件，检查节点名称
      if (criteria.name && node.name !== criteria.name) {
        return false;
      }

      return true;
    };

    // 查找第一个匹配节点
    const node = startNode.findOne(callback);

    if (!node) {
      console.log("未找到匹配节点");
      return null;
    }

    console.log(`找到匹配节点: ${node.id} ${node.name}`);

    // 转换为简单对象
    return {
      id: node.id,
      name: node.name,
      type: node.type
    };
  } catch (error) {
    console.error("查找第一个匹配节点失败:", error);
    throw error;
  }
}

// 查找直接子节点
async function findChildren(params) {
  try {
    const { nodeId, criteria } = params;

    if (!nodeId) {
      throw new Error("缺少nodeId参数");
    }

    console.log(`正在查找直接子节点: 父节点ID=${nodeId}, 条件=`, criteria);

    // 获取父节点
    const parentNode = await mg.getNodeById(nodeId);
    if (!parentNode) {
      throw new Error(`找不到父节点: ${nodeId}`);
    }

    // 定义回调函数
    const callback = (node) => {
      // 如果没有条件，则返回所有节点
      if (!criteria) return true;

      // 如果有nodeType条件，检查节点类型
      if (criteria.nodeType && node.type !== criteria.nodeType) {
        return false;
      }

      // 如果有name条件，检查节点名称
      if (criteria.name && node.name !== criteria.name) {
        return false;
      }

      return true;
    };

    // 查找直接子节点
    const nodes = parentNode.findChildren(callback);

    // 转换为简单对象
    const result = nodes.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type
    }));

    console.log(`找到 ${result.length} 个匹配的直接子节点`);

    return result;
  } catch (error) {
    console.error("查找直接子节点失败:", error);
    throw error;
  }
}

// 根据类型查找节点
async function findAllWithCriteria(params) {
  try {
    const { nodeId, criteria } = params;

    if (!nodeId) {
      throw new Error("缺少nodeId参数");
    }

    if (!criteria || !criteria.types || !Array.isArray(criteria.types)) {
      throw new Error("缺少有效的criteria.types参数");
    }

    console.log(`正在根据类型查找节点: 起始节点ID=${nodeId}, 类型=`, criteria.types);

    // 获取起始节点
    const startNode = await mg.getNodeById(nodeId);
    if (!startNode) {
      throw new Error(`找不到起始节点: ${nodeId}`);
    }

    // 查找匹配类型的节点
    const nodes = startNode.findAllWithCriteria({ types: criteria.types });

    // 转换为简单对象
    const result = nodes.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type
    }));

    console.log(`找到 ${result.length} 个匹配类型的节点`);

    return result;
  } catch (error) {
    console.error("根据类型查找节点失败:", error);
    throw error;
  }
}

// 获取子节点
async function getChildren(params) {
  try {
    const { nodeId } = params;

    if (!nodeId) {
      throw new Error("缺少nodeId参数");
    }

    console.log(`正在获取子节点: 父节点ID=${nodeId}`);

    // 获取父节点
    const parentNode = await mg.getNodeById(nodeId);
    if (!parentNode) {
      throw new Error(`找不到父节点: ${nodeId}`);
    }

    // 验证父节点是否有子节点
    if (!parentNode.children) {
      return [];
    }

    // 获取子节点
    const children = parentNode.children;

    // 转换为简单对象
    const result = children.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type
    }));

    console.log(`找到 ${result.length} 个子节点`);

    return result;
  } catch (error) {
    console.error("获取子节点失败:", error);
    throw error;
  }
}

// 设置布局模式
async function setLayoutMode(params) {
  try {
    const node = await mg.getNodeById(params.nodeId);
    if (!node) {
      throw new Error(`无法找到节点 ${params.nodeId}`);
    }
    
    if (!['FRAME', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET'].includes(node.type)) {
      throw new Error(`节点类型 ${node.type} 不支持设置布局模式`);
    }
    
    // 设置布局模式
    node.flexMode = params.flexMode;
    
    // 如果启用了布局模式，设置相关的布局属性
    if (params.flexMode !== 'NONE') {
      // 设置可选属性
      if (params.flexWrap !== undefined) node.flexWrap = params.flexWrap;
      if (params.itemSpacing !== undefined) node.itemSpacing = params.itemSpacing;
      
      // 处理crossAxisSpacing (当设置为null时同步itemSpacing)
      if (params.crossAxisSpacing !== undefined) {
        node.crossAxisSpacing = params.crossAxisSpacing === null ? 
          (params.itemSpacing !== undefined ? params.itemSpacing : node.itemSpacing) : 
          params.crossAxisSpacing;
      }
      
      if (params.mainAxisAlignItems !== undefined) node.mainAxisAlignItems = params.mainAxisAlignItems;
      if (params.crossAxisAlignItems !== undefined) node.crossAxisAlignItems = params.crossAxisAlignItems;
      
      // 只有在flexWrap为WRAP时才能设置crossAxisAlignContent
      if (params.crossAxisAlignContent !== undefined && node.flexWrap === 'WRAP') {
        node.crossAxisAlignContent = params.crossAxisAlignContent;
      }
      
      // 设置内边距
      if (params.paddingLeft !== undefined) node.paddingLeft = params.paddingLeft;
      if (params.paddingRight !== undefined) node.paddingRight = params.paddingRight;
      if (params.paddingTop !== undefined) node.paddingTop = params.paddingTop;
      if (params.paddingBottom !== undefined) node.paddingBottom = params.paddingBottom;

      if (params.resizeToFit !== undefined) {
        node.resizeToFit();
      }
      
      // 设置布局尺寸模式
      // if (params.layoutSizingHorizontal !== undefined) node.layoutSizingHorizontal = params.layoutSizingHorizontal;
      // if (params.layoutSizingVertical !== undefined) node.layoutSizingVertical = params.layoutSizingVertical;
      
      // 设置其他布局属性
      if (params.itemReverseZIndex !== undefined) node.itemReverseZIndex = params.itemReverseZIndex;
      if (params.strokesIncludedInLayout !== undefined) node.strokesIncludedInLayout = params.strokesIncludedInLayout;

      if (params.childrenFlexGrow) {
        for (const [childId, flexGrow] of Object.entries(childrenFlexGrow)) {
          const child = node.children.find(n => n.id === childId);
          if (child) child.flexGrow = flexGrow;
        }
      }
      if (params.childrenAlignSelf) {
        for (const [childId, alignSelf] of Object.entries(childrenAlignSelf)) {
          const child = node.children.find(n => n.id === childId);
          if (child) child.alignSelf = alignSelf;
        }
      }
    }
    
    return { name: node.name, id: node.id };
  } catch (error) {
    console.error('设置布局模式错误:', error);
    throw error;
  }
}

/**
 * 设置自动布局容器的子节点的宽高模式
 * @param {Object} params - 参数对象
 * @param {string} params.nodeId - 子节点的ID
 * @param {string} params.parentId - 父容器节点的ID
 * @param {number} [params.flexGrow] - 是否充满主轴: 0表示固定宽度，1表示充满容器
 * @param {string} [params.alignSelf] - 是否充满交叉轴: STRETCH表示撑满交叉轴，INHERIT表示固定高度
 * @returns {Promise<Object>} 返回节点信息
 */
async function setNodeSizingMode(params) {
  try {
    const { nodeId, parentId, flexGrow, alignSelf } = params;
    
    // 参数验证
    if (!nodeId) {
      throw new Error("必须提供子节点ID (nodeId)");
    }
    
    if (!parentId) {
      throw new Error("必须提供父节点ID (parentId)");
    }
    
    // 获取子节点和父节点
    const childNode = mg.getNodeById(nodeId);
    if (!childNode) {
      throw new Error(`找不到ID为 ${nodeId} 的子节点`);
    }
    
    const parentNode = mg.getNodeById(parentId);
    if (!parentNode) {
      throw new Error(`找不到ID为 ${parentId} 的父节点`);
    }
    
    // 检查父节点是否为自动布局
    if (parentNode.layoutMode === 'NONE') {
      throw new Error("父节点必须是自动布局容器");
    }
    
    // 设置flexGrow和alignSelf属性
    // const updates = {};
    if (flexGrow !== undefined) {
      // updates.flexGrow = flexGrow;
      childNode.flexGrow = flexGrow;
    }
    
    if (alignSelf) {
      // updates.alignSelf = alignSelf;
      childNode.alignSelf = alignSelf;
    }
    
    // 应用更新
    // mg.updateNodeProperties(nodeId, updates);
    
    // 返回更新后的节点
    const updatedNode = mg.getNodeById(nodeId);
    return {
      id: updatedNode.id,
      name: updatedNode.name,
      flexGrow: updatedNode.flexGrow,
      alignSelf: updatedNode.alignSelf
    };
  } catch (error) {
    console.error("设置节点尺寸模式失败:", error);
    throw error;
  }
}