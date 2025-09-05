"""add_external_recording_support

Revision ID: 7fd57d63c561
Revises: 923089c85bcd
Create Date: 2025-09-04 19:06:51.666873

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7fd57d63c561'
down_revision: Union[str, Sequence[str], None] = '923089c85bcd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new columns to sessions table
    op.add_column('sessions', sa.Column('external_platform', sa.String(), nullable=True))
    op.add_column('sessions', sa.Column('external_recording_url', sa.String(), nullable=True))
    op.add_column('sessions', sa.Column('s3_upload_key', sa.String(), nullable=True))
    op.add_column('sessions', sa.Column('s3_upload_status', sa.String(), nullable=True, server_default='pending'))
    op.add_column('sessions', sa.Column('s3_upload_completed_at', sa.DateTime(), nullable=True))
    op.add_column('sessions', sa.Column('transcript', sa.Text(), nullable=True))
    op.add_column('sessions', sa.Column('transcript_status', sa.String(), nullable=True, server_default='pending'))
    op.add_column('sessions', sa.Column('analysis', sa.JSON(), nullable=True))
    op.add_column('sessions', sa.Column('analysis_status', sa.String(), nullable=True, server_default='pending'))
    op.add_column('sessions', sa.Column('participants', sa.JSON(), nullable=True))  # Array of client IDs
    
    # Create indexes for better query performance
    op.create_index('idx_sessions_s3_upload_key', 'sessions', ['s3_upload_key'])
    op.create_index('idx_sessions_external_platform', 'sessions', ['external_platform'])
    
    # Create session_uploads table for tracking upload history
    op.create_table('session_uploads',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('upload_type', sa.String(), nullable=False),  # 'external', 'livekit', 'manual'
        sa.Column('original_url', sa.String(), nullable=True),
        sa.Column('s3_key', sa.String(), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('upload_status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('uploaded_by_user_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('idx_session_uploads_session_id', 'session_uploads', ['session_id'])
    op.create_index('idx_session_uploads_s3_key', 'session_uploads', ['s3_key'])
    op.create_index('idx_session_uploads_status', 'session_uploads', ['upload_status'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop session_uploads table
    op.drop_index('idx_session_uploads_status', table_name='session_uploads')
    op.drop_index('idx_session_uploads_s3_key', table_name='session_uploads')
    op.drop_index('idx_session_uploads_session_id', table_name='session_uploads')
    op.drop_table('session_uploads')
    
    # Drop indexes
    op.drop_index('idx_sessions_external_platform', table_name='sessions')
    op.drop_index('idx_sessions_s3_upload_key', table_name='sessions')
    
    # Drop columns from sessions table
    op.drop_column('sessions', 'participants')
    op.drop_column('sessions', 'analysis_status')
    op.drop_column('sessions', 'analysis')
    op.drop_column('sessions', 'transcript_status')
    op.drop_column('sessions', 'transcript')
    op.drop_column('sessions', 's3_upload_completed_at')
    op.drop_column('sessions', 's3_upload_status')
    op.drop_column('sessions', 's3_upload_key')
    op.drop_column('sessions', 'external_recording_url')
    op.drop_column('sessions', 'external_platform')
