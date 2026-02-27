/**
 * ============================================
 * 空间分析页面
 * ============================================
 *
 * 功能说明：
 * - 等时圈计算与可视化
 * - 缓冲区分析绘制
 * - 范围内要素查询
 * - 距离测量工具
 *
 * @author Emergency Dispatch Team
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Card,
  Form,
  InputNumber,
  Button,
  Select,
  Tabs,
  Table,
  Space,
  Input,
} from "antd";
import { App } from "antd";
import type { TabsProps } from "antd";
import mapService from "@/services/map.service";
import spatialService from "@/services/spatial.service";

interface SpatialAnalysisProps {}

const SpatialAnalysis: React.FC<SpatialAnalysisProps> = () => {
  const { message: appMessage } = App.useApp();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInitializedRef = useRef(false);
  const [activeTab, setActiveTab] = useState("isochrone");
  const [loading, setLoading] = useState(false);

  const [isochroneForm] = Form.useForm();
  const [bufferForm] = Form.useForm();
  const [withinForm] = Form.useForm();
  const [distanceForm] = Form.useForm();

  const [isochroneResult, setIsochroneResult] = useState<any>(null);
  const [bufferResult, setBufferResult] = useState<any>(null);
  const [withinResult, setWithinResult] = useState<any>(null);
  const [distanceResult, setDistanceResult] = useState<any>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!mapInitializedRef.current && mapContainerRef.current) {
      mapService.initMap({
        target: mapContainerRef.current,
        center: [116.404, 39.915],
        zoom: 12,
        minZoom: 3,
        maxZoom: 18,
      });
      mapInitializedRef.current = true;
    }

    return () => {
      mapService.clearAnalysis();
    };
  }, []);

  const handleIsochroneSubmit = useCallback(async () => {
    try {
      const values = await isochroneForm.validateFields();
      setLoading(true);

      const result = await spatialService.isochrone({
        lng: values.lng,
        lat: values.lat,
        minutes: values.minutes || [5, 10, 15],
        profile: values.profile || "car",
      });

      setIsochroneResult(result);

      mapService.clearAnalysis();
      mapService.drawIsochrones(result.isochrones);

      appMessage.success("等时圈计算成功");
    } catch (error) {
      console.error("等时圈计算失败:", error);
      appMessage.error("等时圈计算失败");
    } finally {
      setLoading(false);
    }
  }, [isochroneForm, appMessage]);

  const handleBufferSubmit = useCallback(async () => {
    try {
      const values = await bufferForm.validateFields();
      setLoading(true);

      const result = await spatialService.buffer({
        lng: values.lng,
        lat: values.lat,
        radius: values.radius || 1000,
        rings: values.rings || 3,
        unit: values.unit || "meters",
      });

      setBufferResult(result);

      mapService.clearAnalysis();
      mapService.drawBuffers(result.buffers);

      appMessage.success("缓冲区分析成功");
    } catch (error) {
      console.error("缓冲区分析失败:", error);
      appMessage.error("缓冲区分析失败");
    } finally {
      setLoading(false);
    }
  }, [bufferForm, appMessage]);

  const handleWithinSubmit = useCallback(async () => {
    try {
      const values = await withinForm.validateFields();
      setLoading(true);

      const result = await spatialService.within({
        polygon: values.polygon,
        type: values.type || "resource",
        buffer: values.buffer,
      });

      setWithinResult(result);

      mapService.clearAnalysis();
      mapService.drawPolygon([values.polygon]);

      appMessage.success(`查询到 ${result.count} 个要素`);
    } catch (error) {
      console.error("范围内要素查询失败:", error);
      appMessage.error("范围内要素查询失败");
    } finally {
      setLoading(false);
    }
  }, [withinForm, appMessage]);

  const handleDistanceSubmit = useCallback(async () => {
    try {
      const values = await distanceForm.validateFields();
      setLoading(true);

      const result = await spatialService.distance({
        from: [values.fromLng, values.fromLat],
        to: [values.toLng, values.toLat],
        mode: values.mode || "straight",
      });

      setDistanceResult(result);

      mapService.clearAnalysis();
      mapService.drawDistance(
        [values.fromLng, values.fromLat],
        [values.toLng, values.toLat],
        result.straightDistance,
      );

      appMessage.success("距离计算成功");
    } catch (error) {
      console.error("距离计算失败:", error);
      appMessage.error("距离计算失败");
    } finally {
      setLoading(false);
    }
  }, [distanceForm, appMessage]);

  const startDrawing = useCallback(() => {
    setIsDrawing(true);
    setPolygonPoints([]);
  }, []);

  const finishDrawing = useCallback(async () => {
    setIsDrawing(false);
    if (polygonPoints.length >= 3) {
      await handleWithinSubmit();
    }
  }, [polygonPoints, handleWithinSubmit]);

  const clearAnalysis = useCallback(() => {
    mapService.clearAnalysis();
    setIsochroneResult(null);
    setBufferResult(null);
    setWithinResult(null);
    setDistanceResult(null);
    appMessage.info("已清除分析结果");
  }, [appMessage]);

  const tabItems: TabsProps["items"] = [
    {
      key: "isochrone",
      label: "等时圈分析",
      children: (
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <Card title="等时圈计算">
            <Form form={isochroneForm} layout="vertical">
              <Form.Item
                label="中心点经度"
                name="lng"
                initialValue={116.404}
                rules={[{ required: true, message: "请输入经度" }]}
              >
                <InputNumber style={{ width: "100%" }} placeholder="116.404" />
              </Form.Item>
              <Form.Item
                label="中心点纬度"
                name="lat"
                initialValue={39.915}
                rules={[{ required: true, message: "请输入纬度" }]}
              >
                <InputNumber style={{ width: "100%" }} placeholder="39.915" />
              </Form.Item>
              <Form.Item
                label="时间范围（分钟）"
                name="minutes"
                initialValue="5,10,15"
              >
                <Input placeholder="请输入时间范围，用逗号分隔，例如：5,10,15" />
              </Form.Item>
              <Form.Item label="出行方式" name="profile" initialValue="car">
                <Select
                  options={[
                    { value: "car", label: "汽车" },
                    { value: "bike", label: "自行车" },
                    { value: "foot", label: "步行" },
                  ]}
                />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  onClick={handleIsochroneSubmit}
                  loading={loading}
                >
                  计算等时圈
                </Button>
              </Form.Item>
            </Form>
          </Card>
          {isochroneResult && (
            <Card title="分析结果">
              <Table
                dataSource={isochroneResult.isochrones}
                rowKey="minute"
                columns={[
                  { title: "时间（分钟）", dataIndex: "minute", key: "minute" },
                  {
                    title: "覆盖面积（km²）",
                    dataIndex: ["properties", "area"],
                    key: "area",
                  },
                ]}
                pagination={false}
              />
            </Card>
          )}
        </Space>
      ),
    },
    {
      key: "buffer",
      label: "缓冲区分析",
      children: (
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <Card title="缓冲区计算">
            <Form form={bufferForm} layout="vertical">
              <Form.Item
                label="中心点经度"
                name="lng"
                initialValue={116.404}
                rules={[{ required: true, message: "请输入经度" }]}
              >
                <InputNumber style={{ width: "100%" }} placeholder="116.404" />
              </Form.Item>
              <Form.Item
                label="中心点纬度"
                name="lat"
                initialValue={39.915}
                rules={[{ required: true, message: "请输入纬度" }]}
              >
                <InputNumber style={{ width: "100%" }} placeholder="39.915" />
              </Form.Item>
              <Form.Item label="半径（米）" name="radius" initialValue={1000}>
                <InputNumber style={{ width: "100%" }} min={100} />
              </Form.Item>
              <Form.Item label="缓冲区环数" name="rings" initialValue={3}>
                <InputNumber style={{ width: "100%" }} min={1} max={10} />
              </Form.Item>
              <Form.Item label="单位" name="unit" initialValue="meters">
                <Select
                  options={[
                    { value: "meters", label: "米" },
                    { value: "kilometers", label: "千米" },
                    { value: "miles", label: "英里" },
                  ]}
                />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  onClick={handleBufferSubmit}
                  loading={loading}
                >
                  计算缓冲区
                </Button>
              </Form.Item>
            </Form>
          </Card>
          {bufferResult && (
            <Card title="分析结果">
              <Table
                dataSource={bufferResult.buffers}
                rowKey="radius"
                columns={[
                  { title: "半径（米）", dataIndex: "radius", key: "radius" },
                  { title: "面积（km²）", dataIndex: "area", key: "area" },
                ]}
                pagination={false}
              />
            </Card>
          )}
        </Space>
      ),
    },
    {
      key: "within",
      label: "范围内查询",
      children: (
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <Card title="绘制查询范围">
            <Form form={withinForm} layout="vertical">
              <Form.Item label="查询类型" name="type" initialValue="resource">
                <Select
                  options={[
                    { value: "resource", label: "应急资源" },
                    { value: "building", label: "敏感建筑" },
                    { value: "incident", label: "应急事件" },
                  ]}
                />
              </Form.Item>
              <Form.Item label="缓冲距离（米）" name="buffer" initialValue={0}>
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    onClick={startDrawing}
                    disabled={isDrawing}
                  >
                    开始绘制
                  </Button>
                  <Button
                    onClick={finishDrawing}
                    disabled={!isDrawing || polygonPoints.length < 3}
                  >
                    完成绘制
                  </Button>
                  <Button
                    onClick={() => setPolygonPoints([])}
                    disabled={isDrawing}
                  >
                    清除点
                  </Button>
                </Space>
              </Form.Item>
              {isDrawing && (
                <div>
                  <p>已选择 {polygonPoints.length} 个点（至少需要3个点）</p>
                </div>
              )}
            </Form>
          </Card>
          {withinResult && (
            <Card title={`查询结果（共${withinResult.count}个）`}>
              <Table
                dataSource={withinResult.list}
                rowKey="id"
                columns={[
                  { title: "ID", dataIndex: "id", key: "id", width: 200 },
                  { title: "名称", dataIndex: "name", key: "name" },
                  { title: "类型", dataIndex: "type", key: "type" },
                ]}
                pagination={{ pageSize: 10 }}
              />
            </Card>
          )}
        </Space>
      ),
    },
    {
      key: "distance",
      label: "距离测量",
      children: (
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <Card title="距离计算">
            <Form form={distanceForm} layout="vertical">
              <Form.Item label="起点">
                <Space.Compact style={{ width: "100%" }}>
                  <Form.Item name="fromLng" initialValue={116.404} noStyle>
                    <InputNumber style={{ width: "50%" }} placeholder="经度" />
                  </Form.Item>
                  <Form.Item name="fromLat" initialValue={39.915} noStyle>
                    <InputNumber style={{ width: "50%" }} placeholder="纬度" />
                  </Form.Item>
                </Space.Compact>
              </Form.Item>
              <Form.Item label="终点">
                <Space.Compact style={{ width: "100%" }}>
                  <Form.Item name="toLng" initialValue={116.414} noStyle>
                    <InputNumber style={{ width: "50%" }} placeholder="经度" />
                  </Form.Item>
                  <Form.Item name="toLat" initialValue={39.925} noStyle>
                    <InputNumber style={{ width: "50%" }} placeholder="纬度" />
                  </Form.Item>
                </Space.Compact>
              </Form.Item>
              <Form.Item label="计算方式" name="mode" initialValue="straight">
                <Select
                  options={[
                    { value: "straight", label: "直线距离" },
                    { value: "route", label: "路线距离" },
                  ]}
                />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  onClick={handleDistanceSubmit}
                  loading={loading}
                >
                  计算距离
                </Button>
              </Form.Item>
            </Form>
          </Card>
          {distanceResult && (
            <Card title="计算结果">
              <p>
                <strong>直线距离：</strong>{" "}
                {distanceResult.straightDistance.toFixed(2)} km
              </p>
              {distanceResult.routeDistance && (
                <p>
                  <strong>路线距离：</strong>{" "}
                  {distanceResult.routeDistance.toFixed(2)} km
                </p>
              )}
              {distanceResult.routeDuration && (
                <p>
                  <strong>预计耗时：</strong>{" "}
                  {Math.round(distanceResult.routeDuration / 60)} 分钟
                </p>
              )}
            </Card>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      </div>
      <div style={{ height: "50vh", borderTop: "1px solid #f0f0f0" }}>
        <div style={{ padding: "16px" }}>
          <Space style={{ marginBottom: "16px" }}>
            <Button onClick={clearAnalysis}>清除分析</Button>
          </Space>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
          />
        </div>
      </div>
    </div>
  );
};

export default SpatialAnalysis;
