"""Initial migration

Revision ID: 0001
Revises: 
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=100), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False, server_default='VIEWER'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username'),
        sa.UniqueConstraint('email'),
    )
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # User preferences
    op.create_table(
        'user_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('theme', sa.String(length=20), nullable=False, server_default='light'),
        sa.Column('auto_refresh', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('refresh_interval', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('notifications', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('sound_alerts', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('compact_mode', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('timezone', sa.String(length=50), nullable=False, server_default='UTC'),
        sa.Column('language', sa.String(length=10), nullable=False, server_default='en'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_user_preferences_user_id'), 'user_preferences', ['user_id'], unique=True)

    # Alert history
    op.create_table(
        'alert_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('metric', sa.String(length=100), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('threshold', sa.Float(), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('acknowledged', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('acknowledged_by', sa.Integer(), nullable=True),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['acknowledged_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_alert_history_created_at'), 'alert_history', ['created_at'], unique=False)
    op.create_index(op.f('ix_alert_history_metric'), 'alert_history', ['metric'], unique=False)
    op.create_index(op.f('ix_alert_history_severity'), 'alert_history', ['severity'], unique=False)

    # Threshold configurations
    op.create_table(
        'threshold_configs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('metric', sa.String(length=100), nullable=False),
        sa.Column('warning_threshold', sa.Float(), nullable=False),
        sa.Column('critical_threshold', sa.Float(), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('metric'),
    )

    # Database connections
    op.create_table(
        'database_connections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('host', sa.String(length=255), nullable=False),
        sa.Column('port', sa.Integer(), nullable=False, server_default='1521'),
        sa.Column('service_name', sa.String(length=100), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('password_encrypted', sa.String(length=255), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_database_connections_name'), 'database_connections', ['name'], unique=True)

    # Metrics snapshots (for historical trends)
    op.create_table(
        'metrics_snapshots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('database_id', sa.Integer(), nullable=False),
        sa.Column('metric_name', sa.String(length=100), nullable=False),
        sa.Column('metric_value', sa.Float(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['database_id'], ['database_connections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_metrics_snapshots_recorded_at'), 'metrics_snapshots', ['recorded_at'], unique=False)
    op.create_index(op.f('ix_metrics_snapshots_metric_name'), 'metrics_snapshots', ['metric_name'], unique=False)
    op.create_index('ix_metrics_snapshots_db_metric_time', 'metrics_snapshots', ['database_id', 'metric_name', 'recorded_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_metrics_snapshots_db_metric_time', table_name='metrics_snapshots')
    op.drop_index(op.f('ix_metrics_snapshots_metric_name'), table_name='metrics_snapshots')
    op.drop_index(op.f('ix_metrics_snapshots_recorded_at'), table_name='metrics_snapshots')
    op.drop_table('metrics_snapshots')

    op.drop_index(op.f('ix_database_connections_name'), table_name='database_connections')
    op.drop_table('database_connections')

    op.drop_table('threshold_configs')

    op.drop_index(op.f('ix_alert_history_severity'), table_name='alert_history')
    op.drop_index(op.f('ix_alert_history_metric'), table_name='alert_history')
    op.drop_index(op.f('ix_alert_history_created_at'), table_name='alert_history')
    op.drop_table('alert_history')

    op.drop_index(op.f('ix_user_preferences_user_id'), table_name='user_preferences')
    op.drop_table('user_preferences')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_table('users')