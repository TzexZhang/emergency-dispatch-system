/**
 * ============================================
 * 轨迹回放页面
 * ============================================
 *
 * 功能说明：
 * - 轨迹查询与筛选
 * - 轨迹回放控制
 * - 热力图可视化
 * - 轨迹统计展示
 *
 * @author Emergency Dispatch Team
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Card,
  Form,
  DatePicker,
  Select,
  Button,
  Table,
  Space,
  Slider,
  Statistic,
  Row,
  Col,
  App,
  Tag,
  Radio,
} from "antd";
import dayjs from "dayjs";
import mapService from "@/services/map.service";
import playbackService from "@/services/playback.service";

const { RangePicker } = DatePicker;

interface PlaybackProps {}

interface TrajectoryStats {
  resourceId: string;
  resourceName: string;
  totalDistance: number;
  maxSpeed: number;
  avgSpeed: number;
  duration: number;
  pointCount: number;
  startTime: string;
  endTime: string;
}

interface MultiTrajectoryData {
  resourceId: string;
  resourceName: string;
  color: string;
  points: Array<{ lng: number; lat: number; timestamp?: string }>;
}

const Playback: React.FC<PlaybackProps> = () => {
  const { message: appMessage } = App.useApp();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInitializedRef = useRef(false);
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [trajectoryData, setTrajectoryData] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [stats, setStats] = useState<TrajectoryStats | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(500);
  const [playbackMode, setPlaybackMode] = useState<"single" | "multi">(
    "single",
  );
  const [multiTrajectoryData, setMultiTrajectoryData] = useState<
    MultiTrajectoryData[]
  >([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [currentTimestamp, setCurrentTimestamp] = useState<string>("");
  const [timeHeatmapData, setTimeHeatmapData] = useState<
    Array<{
      timestamp: string;
      points: { lng: number; lat: number; weight: number }[];
    }>
  >([]);
  const [isHeatmapPlaying, setIsHeatmapPlaying] = useState(false);

  const [resources, setResources] = useState<any[]>([]);

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

    fetchResources();

    return () => {
      mapService.clearTrajectory();
      mapService.stopTrajectoryPlayback();
      mapService.stopMultiTrajectoryPlayback();
      mapService.clearMultiTrajectoryLayers();
      mapService.clearHeatmap();
      mapService.stopTimeHeatmap();
    };
  }, []);

  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch(
        "http://localhost:8000/api/v1/resources?page=1&pageSize=1000",
      );
      const data = await res.json();
      if (data.code === 200) {
        setResources(data.data.list);
      }
    } catch (error) {
      console.error("获取资源列表失败:", error);
    }
  }, []);

  const handleTrajectoryQuery = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const params: any = {
        resourceId: values.resourceId,
        page: 1,
        pageSize: 10000,
      };

      if (values.timeRange) {
        params.startTime = values.timeRange[0].format("YYYY-MM-DD HH:mm:ss");
        params.endTime = values.timeRange[1].format("YYYY-MM-DD HH:mm:ss");
      }

      const result = await playbackService.queryTrajectory(params);
      setTrajectoryData(result);

      const points = result.list.map((p: any) => ({
        lng: p.longitude,
        lat: p.latitude,
      }));

      mapService.clearTrajectory();
      mapService.drawTrajectory(points);

      if (points.length > 0) {
        mapService.flyTo(points[0].lng, points[0].lat, 14);
      }

      appMessage.success(`查询到 ${result.list.length} 条轨迹数据`);
    } catch (error) {
      console.error("轨迹查询失败:", error);
      appMessage.error("轨迹查询失败");
    } finally {
      setLoading(false);
    }
  }, [form, appMessage]);

  const handleHeatmapQuery = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const params: any = {
        resourceId: values.resourceId,
        gridSize: 50,
      };

      if (values.timeRange) {
        params.startTime = values.timeRange[0].format("YYYY-MM-DD HH:mm:ss");
        params.endTime = values.timeRange[1].format("YYYY-MM-DD HH:mm:ss");
      }

      const result = await playbackService.getHeatmap(params);
      setHeatmapData(result);

      const points = result.points.map((p: any) => ({
        lng: p.lng,
        lat: p.lat,
        weight: p.weight,
      }));

      mapService.clearTrajectory();
      mapService.drawHeatmap(points);

      if (points.length > 0) {
        mapService.flyTo(points[0].lng, points[0].lat, 13);
      }

      appMessage.success("热力图生成成功");
    } catch (error) {
      console.error("热力图生成失败:", error);
      appMessage.error("热力图生成失败");
    } finally {
      setLoading(false);
    }
  }, [form, appMessage]);

  const handleStatsQuery = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const params: any = {
        resourceId: values.resourceId,
      };

      if (values.timeRange) {
        params.startTime = values.timeRange[0].format("YYYY-MM-DD HH:mm:ss");
        params.endTime = values.timeRange[1].format("YYYY-MM-DD HH:mm:ss");
      }

      const result = await playbackService.getStats(params);
      setStats(result);

      appMessage.success("统计数据获取成功");
    } catch (error) {
      console.error("统计数据获取失败:", error);
      appMessage.error("统计数据获取失败");
    } finally {
      setLoading(false);
    }
  }, [form, appMessage]);

  const handlePlay = useCallback(() => {
    if (!trajectoryData || trajectoryData.list.length === 0) {
      appMessage.warning("请先查询轨迹数据");
      return;
    }

    const points = trajectoryData.list.map((p: any) => ({
      lng: p.longitude,
      lat: p.latitude,
    }));

    setIsPlaying(true);
    setPlaybackProgress(0);

    mapService.playTrajectory(
      points,
      playbackSpeed,
      (index) => {
        setPlaybackProgress((index / points.length) * 100);
      },
      () => {
        setIsPlaying(false);
        appMessage.success("回放完成");
      },
    );
  }, [trajectoryData, playbackSpeed, appMessage]);

  const handlePause = useCallback(() => {
    mapService.stopTrajectoryPlayback();
    mapService.stopMultiTrajectoryPlayback();
    setIsPlaying(false);
  }, []);

  const handleSpeedChange = useCallback((value: number) => {
    setPlaybackSpeed(1000 - value);
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const values = await form.validateFields();

      const params: any = {
        resourceId: values.resourceId,
        format: "csv",
      };

      if (values.timeRange) {
        params.startTime = values.timeRange[0].format("YYYY-MM-DD HH:mm:ss");
        params.endTime = values.timeRange[1].format("YYYY-MM-DD HH:mm:ss");
      }

      const blob = await playbackService.exportTrajectory(params);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trajectory_${values.resourceId}_${dayjs().format("YYYYMMDDHHmmss")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      appMessage.success("导出成功");
    } catch (error) {
      console.error("导出失败:", error);
      appMessage.error("导出失败");
    }
  }, [form, appMessage]);

  const handleMultiTrajectoryQuery = useCallback(async () => {
    try {
      if (selectedResourceIds.length === 0) {
        appMessage.warning("请至少选择一个资源");
        return;
      }

      const values = await form.validateFields();
      setLoading(true);

      const baseParams: any = {
        page: 1,
        pageSize: 10000,
      };

      if (values.timeRange) {
        baseParams.startTime = values.timeRange[0].format(
          "YYYY-MM-DD HH:mm:ss",
        );
        baseParams.endTime = values.timeRange[1].format("YYYY-MM-DD HH:mm:ss");
      }

      const colors = [
        "#ff4d4f",
        "#1890ff",
        "#52c41a",
        "#faad14",
        "#722ed1",
        "#eb2f96",
      ];
      const trajectoryPromises = selectedResourceIds.map(
        async (resourceId, index) => {
          const result = await playbackService.queryTrajectory({
            ...baseParams,
            resourceId,
          });

          const resource = resources.find((r) => r.id === resourceId);
          return {
            resourceId,
            resourceName: resource?.resourceName || resourceId,
            color: colors[index % colors.length],
            points: result.list.map((p: any) => ({
              lng: p.longitude,
              lat: p.latitude,
              timestamp: p.recordedAt,
            })),
          };
        },
      );

      const trajectories = await Promise.all(trajectoryPromises);
      setMultiTrajectoryData(trajectories);

      mapService.initMultiTrajectoryLayers(
        trajectories.map((t) => ({
          resourceId: t.resourceId,
          resourceName: t.resourceName,
          color: t.color,
        })),
      );

      if (trajectories.length > 0 && trajectories[0].points.length > 0) {
        mapService.flyTo(
          trajectories[0].points[0].lng,
          trajectories[0].points[0].lat,
          13,
        );
      }

      appMessage.success(`查询到 ${trajectories.length} 个资源的轨迹数据`);
    } catch (error) {
      console.error("多车辆轨迹查询失败:", error);
      appMessage.error("多车辆轨迹查询失败");
    } finally {
      setLoading(false);
    }
  }, [selectedResourceIds, form, resources, appMessage]);

  const handleMultiPlay = useCallback(() => {
    if (multiTrajectoryData.length === 0) {
      appMessage.warning("请先查询多车辆轨迹数据");
      return;
    }

    setIsPlaying(true);
    setPlaybackProgress(0);

    mapService.playMultiTrajectory(
      multiTrajectoryData,
      playbackSpeed,
      (timestamp, progress) => {
        setCurrentTimestamp(timestamp);
        setPlaybackProgress(progress);
      },
      () => {
        setIsPlaying(false);
        appMessage.success("多车辆回放完成");
      },
    );
  }, [multiTrajectoryData, playbackSpeed, appMessage]);

  const handleClear = useCallback(() => {
    mapService.clearTrajectory();
    mapService.stopTrajectoryPlayback();
    mapService.clearMultiTrajectoryLayers();
    mapService.clearHeatmap();
    mapService.stopTimeHeatmap();
    setTrajectoryData(null);
    setHeatmapData(null);
    setStats(null);
    setMultiTrajectoryData([]);
    setSelectedResourceIds([]);
    setCurrentTimestamp("");
    setTimeHeatmapData([]);
    setPlaybackProgress(0);
    setIsPlaying(false);
    setIsHeatmapPlaying(false);
    appMessage.info("已清除所有数据");
  }, [appMessage]);

  const handleTimeHeatmapQuery = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const params: any = {
        resourceId: values.resourceId,
        gridSize: 50,
      };

      if (values.timeRange) {
        params.startTime = values.timeRange[0].format("YYYY-MM-DD HH:mm:ss");
        params.endTime = values.timeRange[1].format("YYYY-MM-DD HH:mm:ss");
      }

      const result = await playbackService.getTimeHeatmap(params);
      setTimeHeatmapData(result);
      appMessage.success(`查询到 ${result.length} 个时间片的热力图数据`);
    } catch (error) {
      console.error("时间动态热力图查询失败:", error);
      appMessage.error("时间动态热力图查询失败");
    } finally {
      setLoading(false);
    }
  }, [form, appMessage]);

  const handleTimeHeatmapPlay = useCallback(() => {
    if (timeHeatmapData.length === 0) {
      appMessage.warning("请先查询时间动态热力图数据");
      return;
    }

    setIsHeatmapPlaying(true);
    mapService.playTimeHeatmap(
      timeHeatmapData,
      playbackSpeed,
      (timestamp, progress) => {
        setCurrentTimestamp(timestamp);
        setPlaybackProgress(progress);
      },
      () => {
        setIsHeatmapPlaying(false);
        appMessage.success("时间动态热力图回放完成");
      },
    );
  }, [timeHeatmapData, playbackSpeed, appMessage]);

  const handleTimeHeatmapPause = useCallback(() => {
    mapService.stopTimeHeatmap();
    setIsHeatmapPlaying(false);
  }, []);

  const trajectoryColumns = [
    { title: "ID", dataIndex: "id", key: "id", width: 200 },
    { title: "时间", dataIndex: "recordedAt", key: "recordedAt", width: 180 },
    { title: "经度", dataIndex: "longitude", key: "longitude", width: 120 },
    { title: "纬度", dataIndex: "latitude", key: "latitude", width: 120 },
    { title: "速度", dataIndex: "speed", key: "speed", width: 100 },
    { title: "方向", dataIndex: "direction", key: "direction", width: 100 },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      </div>
      <div style={{ height: "60vh", borderTop: "1px solid #f0f0f0" }}>
        <div style={{ padding: "16px" }}>
          <Space style={{ marginBottom: "16px" }}>
            <Button onClick={handleClear}>清除数据</Button>
            <Radio.Group
              value={playbackMode}
              onChange={(e) => {
                setPlaybackMode(e.target.value);
                handleClear();
              }}
            >
              <Radio.Button value="single">单车辆回放</Radio.Button>
              <Radio.Button value="multi">多车辆同步</Radio.Button>
            </Radio.Group>
          </Space>

          <Space style={{ marginBottom: "16px" }}>
            <Button
              type="primary"
              onClick={playbackMode === "single" ? handlePlay : handleMultiPlay}
              disabled={
                isPlaying ||
                (playbackMode === "single"
                  ? !trajectoryData
                  : multiTrajectoryData.length === 0)
              }
            >
              {playbackMode === "single" ? "播放" : "同步播放"}
            </Button>
            <Button onClick={handlePause} disabled={!isPlaying}>
              暂停
            </Button>
            <span>速度：</span>
            <Slider
              style={{ width: 150 }}
              min={100}
              max={900}
              value={1000 - playbackSpeed}
              onChange={handleSpeedChange}
            />
            {playbackMode === "single" && (
              <>
                <Button onClick={handleExport} disabled={!trajectoryData}>
                  导出
                </Button>
                {timeHeatmapData.length > 0 && (
                  <>
                    <Button
                      type={isHeatmapPlaying ? "default" : "primary"}
                      onClick={handleTimeHeatmapPlay}
                      disabled={isHeatmapPlaying}
                    >
                      播放时间热力图
                    </Button>
                    <Button
                      onClick={handleTimeHeatmapPause}
                      disabled={!isHeatmapPlaying}
                    >
                      暂停热力图
                    </Button>
                  </>
                )}
              </>
            )}
          </Space>

          {isPlaying && (
            <div style={{ marginBottom: "16px" }}>
              <span>回放进度：{playbackProgress.toFixed(1)}%</span>
              {playbackMode === "multi" && currentTimestamp && (
                <span style={{ marginLeft: "16px" }}>
                  当前时间：{dayjs(currentTimestamp).format("HH:mm:ss")}
                </span>
              )}
            </div>
          )}

          <Card title="查询条件" style={{ marginBottom: "16px" }}>
            <Form form={form} layout="inline">
              {playbackMode === "single" ? (
                <Form.Item
                  name="resourceId"
                  label="资源"
                  rules={[{ required: true, message: "请选择资源" }]}
                >
                  <Select
                    style={{ width: 200 }}
                    placeholder="请选择资源"
                    showSearch
                    optionFilterProp="children"
                    options={resources.map((r) => ({
                      value: r.id,
                      label: r.resourceName,
                    }))}
                  />
                </Form.Item>
              ) : (
                <Form.Item label="选择资源（多选）">
                  <Select
                    mode="multiple"
                    style={{ width: 400 }}
                    placeholder="请选择多个资源"
                    value={selectedResourceIds}
                    onChange={setSelectedResourceIds}
                    showSearch
                    optionFilterProp="children"
                    options={resources.map((r) => ({
                      value: r.id,
                      label: r.resourceName,
                    }))}
                  />
                  <div style={{ marginTop: "8px" }}>
                    {selectedResourceIds.map((id, index) => {
                      const resource = resources.find((r) => r.id === id);
                      const colors = [
                        "#ff4d4f",
                        "#1890ff",
                        "#52c41a",
                        "#faad14",
                        "#722ed1",
                        "#eb2f96",
                      ];
                      return (
                        <Tag key={id} color={colors[index % colors.length]}>
                          {resource?.resourceName || id}
                        </Tag>
                      );
                    })}
                  </div>
                </Form.Item>
              )}
              <Form.Item name="timeRange" label="时间范围">
                <RangePicker showTime format="YYYY-MM-DD HH:mm:ss" />
              </Form.Item>
              <Form.Item>
                <Space>
                  {playbackMode === "single" ? (
                    <>
                      <Button
                        type="primary"
                        onClick={handleTrajectoryQuery}
                        loading={loading}
                      >
                        查询轨迹
                      </Button>
                      <Button onClick={handleHeatmapQuery} loading={loading}>
                        生成热力图
                      </Button>
                      <Button
                        onClick={handleTimeHeatmapQuery}
                        loading={loading}
                      >
                        时间动态热力图
                      </Button>
                      <Button onClick={handleStatsQuery} loading={loading}>
                        统计数据
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="primary"
                      onClick={handleMultiTrajectoryQuery}
                      loading={loading}
                      disabled={selectedResourceIds.length === 0}
                    >
                      查询多车辆轨迹
                    </Button>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </Card>

          {stats && (
            <Card title="轨迹统计" style={{ marginBottom: "16px" }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="总里程"
                    value={stats.totalDistance.toFixed(2)}
                    suffix="km"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="最高速度"
                    value={stats.maxSpeed.toFixed(2)}
                    suffix="km/h"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="平均速度"
                    value={stats.avgSpeed.toFixed(2)}
                    suffix="km/h"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="行驶时长"
                    value={Math.round(stats.duration / 60)}
                    suffix="分钟"
                  />
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: "16px" }}>
                <Col span={8}>
                  <Statistic title="轨迹点数" value={stats.pointCount} />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="开始时间"
                    value={dayjs(stats.startTime).format("YYYY-MM-DD HH:mm:ss")}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="结束时间"
                    value={dayjs(stats.endTime).format("YYYY-MM-DD HH:mm:ss")}
                  />
                </Col>
              </Row>
            </Card>
          )}

          {trajectoryData && (
            <Card title={`轨迹数据（共${trajectoryData.list.length}条）`}>
              <Table
                dataSource={trajectoryData.list}
                columns={trajectoryColumns}
                rowKey="id"
                pagination={{ pageSize: 20 }}
                scroll={{ y: 200 }}
                size="small"
              />
            </Card>
          )}

          {heatmapData && (
            <Card title={`热力图数据（共${heatmapData.points.length}个点）`}>
              <p>网格大小：{heatmapData.gridSize}m</p>
              <p>
                时间范围：
                {dayjs(heatmapData.startTime).format(
                  "YYYY-MM-DD HH:mm:ss",
                )} 至 {dayjs(heatmapData.endTime).format("YYYY-MM-DD HH:mm:ss")}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Playback;
