// This is the main code file for the Cursor MCP MasterGo plugin
// It handles MasterGo API commands
// 这是 Cursor MCP MasterGo 插件的主代码文件
// 它处理 MasterGo API 命令

// Plugin state
// 插件状态
const state = {
  serverPort: 3055, // Default port 默认端口
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
    const basicCheck = !!mg.currentPage && typeof mg.notify === 'function';
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
    window.addEventListener('unhandledrejection', function(event) {
      console.error('未处理的Promise错误:', event.reason);
      mg.notify("捕获到未处理的异步错误: " + (event.reason.message || String(event.reason)));
    });
    
    // 拦截全局异常
    window.onerror = function(message, source, lineno, colno, error) {
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
mg.ui.onmessage = async (msg) => {
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
        // 根据命令类型执行不同操作
        switch (msg.command) {
          case "create_rectangle":
            // 创建矩形
            console.log("创建矩形，参数:", JSON.stringify(msg));
            const rectangle = mg.createRectangle();
            rectangle.x = msg.x || 0;
            rectangle.y = msg.y || 0;
            rectangle.resize(msg.width || 100, msg.height || 100);
            rectangle.name = msg.name || "矩形";
            mg.currentPage.appendChild(rectangle);
            mg.notify("矩形创建成功!");
            break;
            
          case "create_ellipse":
            // 创建椭圆
            console.log("创建椭圆，参数:", JSON.stringify(msg));
            const ellipse = mg.createEllipse();
            ellipse.x = msg.x || 0;
            ellipse.y = msg.y || 0;
            ellipse.resize(msg.width || 100, msg.height || 100);
            ellipse.name = msg.name || "椭圆";
            mg.currentPage.appendChild(ellipse);
            mg.notify("椭圆创建成功!");
            break;
            
          case "create_circle":
            // 创建圆形
            console.log("创建圆形，参数:", JSON.stringify(msg));
            const circle = mg.createEllipse();
            circle.x = msg.x || 0;
            circle.y = msg.y || 0;
            const size = msg.size || 100;
            circle.resize(size, size);
            circle.name = msg.name || "圆形";
            mg.currentPage.appendChild(circle);
            mg.notify("圆形创建成功!");
            break;
            
          case "create_text":
            // 创建文本
            console.log("创建文本，参数:", JSON.stringify(msg));
            const text = mg.createText();
            text.x = msg.x || 0;
            text.y = msg.y || 0;
            text.characters = msg.text || "文本";
            text.name = msg.name || msg.text || "文本";
            if (msg.fontSize) text.fontSize = msg.fontSize;
            mg.currentPage.appendChild(text);
            mg.notify("文本创建成功!");
            break;
            
          case "create_frame":
            // 创建框架
            console.log("创建框架，参数:", JSON.stringify(msg));
            const frame = mg.createFrame();
            frame.x = msg.x || 0;
            frame.y = msg.y || 0;
            frame.resize(msg.width || 300, msg.height || 200);
            frame.name = msg.name || "框架";
            mg.currentPage.appendChild(frame);
            mg.notify("框架创建成功!");
            break;
            
          default:
            console.warn("未知命令:", msg.command);
            mg.notify(`未知命令: ${msg.command}`);
        }
      } catch (error) {
        console.error("执行命令失败:", error);
        mg.notify(`执行失败: ${error.message}`);
      }
    } else {
      console.warn("收到无效消息，缺少command字段:", JSON.stringify(msg));
    }
  } catch (error) {
    console.error("处理消息时发生错误:", error);
    mg.notify("处理消息时出错: " + error.message);
  }
};

// 命令处理器
async function handleCommand(command, params) {
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
    default:
      throw new Error(`未知命令: ${command}`);
  }
}

// 获取文档信息
async function getDocumentInfo() {
  try {
    await mg.currentPage.loadAsync();
    return {
      name: mg.currentPage.name,
      id: mg.currentPage.id,
      type: mg.currentPage.type,
      children: mg.currentPage.children.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
      }))
    };
  } catch (error) {
    console.error("获取文档信息失败:", error);
    throw error;
  }
}

// 获取选择
async function getSelection() {
  try {
    return {
      selectionCount: mg.currentPage.selection.length,
      selection: mg.currentPage.selection.map(node => ({
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
    const node = await mg.getNodeByIdAsync(nodeId);
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
      fillColor
    } = params || {};
    
    // 创建矩形
    const rectangle = mg.createRectangle();
    
    // 设置基本属性
    rectangle.x = x;
    rectangle.y = y;
    rectangle.resize(width, height);
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
    
    // 添加到当前页面
    mg.currentPage.appendChild(rectangle);
    
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
      fillColor
    } = params || {};
    
    // 创建椭圆
    const ellipse = mg.createEllipse();
    
    // 设置基本属性
    ellipse.x = x;
    ellipse.y = y;
    ellipse.resize(width, height);
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
    
    // 添加到当前页面
    mg.currentPage.appendChild(ellipse);
    
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
    mg.currentPage.appendChild(circle);
    
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
      strokeWeight = 1
    } = params || {};
    
    // 创建框架
    const frame = mg.createFrame();
    
    // 设置基本属性
    frame.x = x;
    frame.y = y;
    frame.resize(width, height);
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
    
    // 添加到当前页面
    mg.currentPage.appendChild(frame);
    
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
      name,
      fontSize = 14,
      fontColor
    } = params || {};
    
    // 创建文本
    const textNode = mg.createText();
    
    // 设置基本属性
    textNode.x = x;
    textNode.y = y;
    textNode.characters = text;
    textNode.name = name || text;
    
    // 设置字体大小
    if (fontSize) {
      textNode.fontSize = fontSize;
    }
    
    // 设置字体颜色
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
    
    // 添加到当前页面
    mg.currentPage.appendChild(textNode);
    
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
  try {
    const { nodeId, r = 0, g = 0, b = 0, a = 1 } = params;
    
    if (!nodeId) {
      throw new Error("缺少nodeId参数");
    }
    
    const node = await mg.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`找不到节点: ${nodeId}`);
    }
    
    // 设置填充色
    node.fills = [{
      type: "SOLID",
      color: { r, g, b },
      opacity: a
    }];
    
    return {
      id: node.id,
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
    
    const node = await mg.getNodeByIdAsync(nodeId);
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
    
    const node = await mg.getNodeByIdAsync(nodeId);
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
    
    const node = await mg.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`找不到节点: ${nodeId}`);
    }
    
    // 调整大小
    if (width !== undefined && height !== undefined) {
      node.resize(width, height);
    } else {
      if (width !== undefined) node.width = width;
      if (height !== undefined) node.height = height;
    }
    
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
    
    const node = await mg.getNodeByIdAsync(nodeId);
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
    
    if (!nodeId) {
      throw new Error("缺少nodeId参数");
    }
    
    const node = await mg.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`找不到节点: ${nodeId}`);
    }
    
    // 设置圆角
    if (Array.isArray(corners) && corners.length === 4) {
      // 单独设置每个角
      node.cornerRadius = {
        topLeft: corners[0] ? radius : 0,
        topRight: corners[1] ? radius : 0,
        bottomRight: corners[2] ? radius : 0,
        bottomLeft: corners[3] ? radius : 0
      };
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
    
    const node = await mg.getNodeByIdAsync(nodeId);
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