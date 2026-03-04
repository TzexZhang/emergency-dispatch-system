import { useState, useCallback } from "react";
import {
  Layout,
  Button,
  message,
  Modal,
  Form,
  Input,
  Select,
  Card,
  Row,
  Col,
} from "antd";
import {
  SaveOutlined,
  ClearOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  LineOutlined,
  AreaChartOutlined,
} from "@ant-design/icons";
import MapContainer from "@components/Map/MapContainer";
import { mapService } from "@services/map.service";
import { http } from "@utils/http";
import type { DrawingType, PlottingData } from "@/types";

const { Content } = Layout;

const TacticalPlotting: React.FC = () => {
  const [form] = Form.useForm();
  const [drawingMode, setDrawingMode] = useState<null | DrawingType>(null);
  const [drawings, setDrawings] = useState<PlottingData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleStartDrawing = useCallback(
    (mode: DrawingType) => {
      if (drawingMode === mode) {
        mapService.disableDrawing();
        setDrawingMode(null);
      } else {
        mapService.startDrawing(mode);
        setDrawingMode(mode);
        message.info(
          `开始${mode === "point" ? "标记点" : mode === "line" ? "路径" : "区域"}绘制`,
        );
      }
    },
    [drawingMode],
  );

  const handleSaveDrawing = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const currentDrawing = mapService.getCurrentDrawing();

      if (!currentDrawing) {
        message.error("没有可保存的绘制内容");
        return;
      }

      const drawingData: PlottingData = {
        id: editingId || `${Date.now()}`,
        type: currentDrawing.type,
        name: values.name,
        description: values.description,
        color: values.color,
        coordinates: currentDrawing.coordinates,
        createdBy: "current_user",
        createdAt: new Date().toISOString(),
      };

      const res = await http.post("/api/v1/plotting", drawingData);
      if (res?.data) {
        setDrawings((prev) => {
          const filtered = prev.filter((d) => d.id !== editingId);
          return [...filtered, res.data];
        });
        message.success("保存成功");
        setModalVisible(false);
        setEditingId(null);
        mapService.clearDrawing();
        setDrawingMode(null);
      }
    } catch (error) {
      message.error("保存失败");
    }
  }, [editingId, form]);

  const handleClearAll = useCallback(() => {
    Modal.confirm({
      title: "确认清空",
      content: "确定要清空所有标绘吗？",
      onOk: () => {
        mapService.clearAnalysisLayer();
        setDrawings([]);
        message.success("已清空");
      },
    });
  }, []);

  const handleExport = useCallback(() => {
    const geoJson = {
      type: "FeatureCollection",
      features: drawings.map((d) => ({
        type: "Feature",
        properties: {
          name: d.name,
          description: d.description,
          type: d.type,
          color: d.color,
        },
        geometry: {
          type:
            d.type === "point"
              ? "Point"
              : d.type === "line"
                ? "LineString"
                : "Polygon",
          coordinates: d.coordinates,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geoJson, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plotting_${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    message.success("导出成功");
  }, [drawings]);

  return (
    <Layout style={{ height: "100%" }}>
      <Content
        style={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <Card
          title="战术标绘工具"
          size="small"
          style={{ marginBottom: "16px" }}
        >
          <Row gutter={[8, 8]}>
            <Col>
              <Button
                type={drawingMode === "point" ? "primary" : "default"}
                icon={<EnvironmentOutlined />}
                onClick={() => handleStartDrawing("point")}
              >
                标记点
              </Button>
            </Col>
            <Col>
              <Button
                type={drawingMode === "line" ? "primary" : "default"}
                icon={<LineOutlined />}
                onClick={() => handleStartDrawing("line")}
              >
                路径绘制
              </Button>
            </Col>
            <Col>
              <Button
                type={drawingMode === "polygon" ? "primary" : "default"}
                icon={<AreaChartOutlined />}
                onClick={() => handleStartDrawing("polygon")}
              >
                区域绘制
              </Button>
            </Col>
            <Col>
              <Button
                icon={<SaveOutlined />}
                onClick={() => setModalVisible(true)}
              >
                保存标绘
              </Button>
            </Col>
            <Col>
              <Button icon={<ClearOutlined />} onClick={handleClearAll}>
                清空
              </Button>
            </Col>
            <Col>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出
              </Button>
            </Col>
          </Row>
        </Card>

        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <MapContainer key="tactical-plotting" resources={[]} />
        </div>
      </Content>

      <Modal
        title="保存标绘"
        open={modalVisible}
        onOk={handleSaveDrawing}
        onCancel={() => {
          setModalVisible(false);
          setEditingId(null);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="标绘名称"
            rules={[{ required: true, message: "请输入标绘名称" }]}
          >
            <Input placeholder="请输入标绘名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入描述信息" />
          </Form.Item>
          <Form.Item name="color" label="颜色" initialValue="#1890ff">
            <Select>
              <Select.Option value="#1890ff">蓝色</Select.Option>
              <Select.Option value="#52c41a">绿色</Select.Option>
              <Select.Option value="#faad14">黄色</Select.Option>
              <Select.Option value="#ff4d4f">红色</Select.Option>
              <Select.Option value="#722ed1">紫色</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default TacticalPlotting;
