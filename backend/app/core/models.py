from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


def _to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)


class UserRole(str, Enum):
    DBA = "DBA"
    VIEWER = "VIEWER"


class UserBase(BaseModel):
    username: str
    email: str
    role: UserRole = UserRole.VIEWER


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserInDB(UserBase):
    id: int
    hashed_password: str
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class User(UserBase):
    id: int
    is_active: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    sub: str
    role: str
    exp: int
    type: str


# Overview models
class DatabaseStatus(CamelModel):
    name: str
    version: str
    host: str
    platform: str
    status: str
    role: str
    startup_time: str
    uptime_seconds: int


class AlertSummary(CamelModel):
    critical: int
    warning: int
    info: int
    last_checked: str


class StorageSummary(CamelModel):
    total_gb: float = Field(alias="totalGB")
    used_gb: float = Field(alias="usedGB")
    free_gb: float = Field(alias="freeGB")
    pct_used: float
    tablespace_count: int
    critical_tablespaces: int


class SessionSummary(CamelModel):
    total: int
    active: int
    inactive: int
    blocked: int
    pct_active: float


class IOSummary(CamelModel):
    read_mbps: float = Field(alias="readMBps")
    write_mbps: float = Field(alias="writeMBps")
    read_iops: float = Field(alias="readIOPS")
    write_iops: float = Field(alias="writeIOPS")
    avg_read_latency_ms: float
    avg_write_latency_ms: float


class WaitClassData(CamelModel):
    wait_class: str
    waits_per_sec: float
    time_waited_ms: float
    pct_db_time: float = Field(alias="pctDBTime")


class WaitSummary(CamelModel):
    top_wait_classes: List[WaitClassData]
    total_waits_per_sec: float
    db_time_per_sec: float


class OverviewData(CamelModel):
    database: DatabaseStatus
    alerts: AlertSummary
    storage: StorageSummary
    sessions: SessionSummary
    io: IOSummary
    waits: WaitSummary
    timestamp: str


class TimeSeriesPoint(BaseModel):
    timestamp: str
    value: float


class TimeSeriesData(BaseModel):
    timestamps: List[str]
    series: dict[str, List[float]]


# Instance Viewer models
class DatabaseInfo(CamelModel):
    name: str
    version: str
    host: str
    platform: str
    status: str
    startup_time: str
    log_mode: str
    role: str
    instance_number: int
    uptime_seconds: int


class ClientSummary(CamelModel):
    machine: str
    program: str
    module: str
    session_count: int


class ProcessMetrics(CamelModel):
    process_count: int
    exec_rate: float
    parse_rate: float
    open_cursors: int
    commit_rate: float
    rollback_rate: float


class SGAMetrics(CamelModel):
    total_mb: float = Field(serialization_alias='totalMB')
    buffer_cache_mb: float = Field(serialization_alias='bufferCacheMB')
    shared_pool_mb: float = Field(serialization_alias='sharedPoolMB')
    shared_pool_free_mb: float = Field(default=0.0, serialization_alias='sharedPoolFreeMB')
    large_pool_mb: float = Field(serialization_alias='largePoolMB')
    java_pool_mb: float = Field(serialization_alias='javaPoolMB')
    streams_pool_mb: float = Field(serialization_alias='streamsPoolMB')
    redo_log_buffer_mb: float = Field(serialization_alias='redoLogBufferMB')
    fixed_sga: float = Field(serialization_alias='fixedSGA')


class PGAMetrics(CamelModel):
    aggregate_target_mb: float = Field(serialization_alias='aggregateTargetMB')
    total_allocated_mb: float = Field(serialization_alias='totalAllocatedMB')
    total_used_mb: float = Field(serialization_alias='totalUsedMB')
    cache_hit_percentage: float = Field(serialization_alias='cacheHitPercentage')
    max_allocated_mb: float = Field(serialization_alias='maxAllocatedMB')


class MemoryMetrics(CamelModel):
    sga: SGAMetrics
    pga: PGAMetrics
    buffer_cache_hit_ratio: float
    library_cache_hit_ratio: float


class TablespaceInfo(CamelModel):
    name: str
    type: str
    status: str
    size_mb: float = Field(serialization_alias='sizeMB')
    used_mb: float = Field(serialization_alias='usedMB')
    free_mb: float = Field(serialization_alias='freeMB')
    pct_used: float = Field(serialization_alias='pctUsed')
    autoextensible: bool
    max_size_mb: Optional[float] = Field(default=None, serialization_alias='maxSizeMB')


class RedoLogInfo(CamelModel):
    group: int
    members: int
    size_mb: float = Field(serialization_alias='sizeMB')
    status: str
    switches_per_hour: float


class StorageMetrics(CamelModel):
    tablespaces: List[TablespaceInfo]
    redo_logs: List[RedoLogInfo]
    archive_log_rate: float


class CPURatio(CamelModel):
    db_cpu_pct: float
    os_cpu_pct: float
    db_time_per_sec: float


class TopSQL(CamelModel):
    sql_id: str
    plan_hash_value: int
    executions: int
    cpu_time_sec: float
    elapsed_time_sec: float
    buffer_gets: int
    disk_reads: int
    rows_processed: int
    sql_text: str


class InstanceInfo(CamelModel):
    database: DatabaseInfo
    clients: List[ClientSummary]
    processes: ProcessMetrics
    memory: MemoryMetrics
    storage: StorageMetrics
    cpu_ratio: CPURatio
    top_sql: List[TopSQL]


# Performance Hub / ASH models
class AASDataPoint(BaseModel):
    timestamp: str
    wait_class: str
    aas: float
    samples: int


class DrilldownRow(BaseModel):
    dimension_value: str
    filter_value: str
    samples: int
    aas: float
    pct_total: float


class DrilldownData(BaseModel):
    dimension: str
    filter_dimension: str
    data: List[DrilldownRow]


# SQL Monitor models
class SQLMonitorEntry(BaseModel):
    sql_id: str
    sql_exec_id: int
    status: str
    duration_sec: float
    cpu_time_sec: float
    io_time_sec: float
    sql_text: str
    username: str
    module: str
    px_servers: int
    start_time: str
    last_refresh_time: str


class ExecutionPlanStep(BaseModel):
    id: int
    parent_id: Optional[int] = None
    operation: str
    options: Optional[str] = None
    object_name: Optional[str] = None
    cost: int
    cardinality: int
    bytes: int
    optimizer: Optional[str] = None
    distribution: Optional[str] = None
    access_predicates: Optional[str] = None
    filter_predicates: Optional[str] = None
    depth: int = 0


class ParallelismDetail(BaseModel):
    qcsid: int
    dfo_number: int
    tq_id: int
    server_type: str
    num_rows: int
    bytes: int
    open_time: float
    avg_latency: float


class SQLMonitorDetail(SQLMonitorEntry):
    plan_hash_value: int
    executions: int
    buffer_gets: int
    disk_reads: int
    disk_writes: int
    physical_read_requests: int
    physical_read_bytes: int
    physical_write_requests: int
    physical_write_bytes: int
    execution_plan: List[ExecutionPlanStep]
    parallelism: List[ParallelismDetail]


# Sessions models
class SessionInfo(BaseModel):
    sid: int
    serial: int
    username: Optional[str] = None
    machine: str
    program: str
    module: Optional[str] = None
    action: Optional[str] = None
    logon_time: str
    last_call_et: int
    status: str
    state: str
    wait_class: Optional[str] = None
    event: Optional[str] = None
    seconds_in_wait: int
    blocking_session: Optional[int] = None
    blocking_instance: Optional[int] = None
    sql_id: Optional[str] = None
    prev_sql_id: Optional[str] = None
    pga_allocated_mb: float
    pga_used_mb: float


class BlockingChain(BaseModel):
    blocker: SessionInfo
    blocked: List[SessionInfo]
    object_name: Optional[str] = None
    lock_type: str
    duration_sec: int


# Storage models
class DatafileInfo(BaseModel):
    file_id: int
    file_name: str
    tablespace_name: str
    size_mb: float
    max_size_mb: Optional[float] = None
    autoextensible: bool
    increment_mb: Optional[float] = None
    status: str
    online_status: str


class SegmentInfo(BaseModel):
    owner: str
    segment_name: str
    segment_type: str
    size_mb: float
    extents: int


class GrowthPoint(BaseModel):
    date: str
    used_mb: float
    allocated_mb: float


class TablespaceDetail(TablespaceInfo):
    datafiles: List[DatafileInfo]
    segments: List[SegmentInfo]
    growth_trend: List[GrowthPoint]


class CapacityProjection(BaseModel):
    tablespace_name: str
    current_used_mb: float
    current_free_mb: float
    growth_rate_mb_per_day: float
    days_until_warning: Optional[int] = None
    days_until_critical: Optional[int] = None
    days_until_full: Optional[int] = None


# Memory models
class AdvisorPoint(BaseModel):
    parameter_value: int
    estd_db_time: float
    estd_physical_reads: float
    benefit_pct: float


class MemoryAdvisor(BaseModel):
    parameter: str
    current_value: int
    advice: List[AdvisorPoint]


# Waits models
class SystemWaitEvent(BaseModel):
    event: str
    wait_class: str
    total_waits: int
    time_waited_sec: float
    avg_wait_ms: float
    pct_db_time: float


class SessionWait(BaseModel):
    sid: int
    serial: int
    username: Optional[str] = None
    event: str
    wait_class: str
    state: str
    seconds_in_wait: int
    p1_text: str
    p1: int
    p2_text: str
    p2: int
    p3_text: str
    p3: int


# Alerts models
class AlertLogEntry(BaseModel):
    timestamp: str
    severity: str
    message: str
    facility: str


class ThresholdConfig(BaseModel):
    tablespace_warn: int
    tablespace_crit: int
    sessions_warn: int
    sessions_crit: int
    cpu_warn: int
    cpu_crit: int
    wait_time_ms_warn: int
    wait_time_ms_crit: int


class TriggeredAlert(BaseModel):
    id: str
    metric: str
    value: float
    threshold: float
    severity: str
    message: str
    timestamp: str
    acknowledged: bool


# Pagination
class PageParams(BaseModel):
    page: int = Field(default=1, ge=1)
    size: int = Field(default=50, ge=1, le=500)


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int