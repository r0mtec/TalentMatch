<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('login')->unique();
            $table->string('password_hash');
            $table->string('role', 50)->index();
            $table->timestamps();
        });

        Schema::create('technologies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->string('group_name', 100)->index();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('technology_synonyms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('technology_id')->constrained('technologies')->cascadeOnDelete();
            $table->string('synonym');
            $table->string('normalized_synonym')->unique();
            $table->timestamps();
            $table->index('technology_id');
        });

        Schema::create('requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->string('position')->nullable();
            $table->text('project_description')->nullable();
            $table->string('grade', 100)->nullable();
            $table->string('location')->nullable();
            $table->string('citizenship')->nullable();
            $table->string('workload', 100)->nullable();
            $table->date('start_date')->nullable();
            $table->string('status', 50)->default('draft')->index();
            $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('requirements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('request_id')->constrained('requests')->cascadeOnDelete();
            $table->foreignUuid('technology_id')->nullable()->constrained('technologies')->nullOnDelete();
            $table->text('raw_text');
            $table->string('type', 20)->index();
            $table->unsignedInteger('weight')->default(1);
            $table->timestamps();
            $table->index('request_id');
            $table->index('technology_id');
        });

        Schema::create('candidates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('display_name');
            $table->string('grade', 100)->nullable();
            $table->string('location')->nullable();
            $table->string('citizenship')->nullable();
            $table->text('languages')->nullable();
            $table->longText('parsed_text')->nullable();
            $table->string('file_storage_key', 512);
            $table->string('original_file_name');
            $table->string('file_mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->string('file_checksum', 128)->nullable()->index();
            $table->string('parsing_status', 50)->default('uploaded')->index();
            $table->string('recognition_status', 50)->default('pending')->index();
            $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index('created_by');
        });

        Schema::create('candidate_skills', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('candidate_id')->constrained('candidates')->cascadeOnDelete();
            $table->foreignUuid('technology_id')->nullable()->constrained('technologies')->nullOnDelete();
            $table->string('normalized_name');
            $table->string('raw_text');
            $table->text('evidence_text')->nullable();
            $table->unsignedTinyInteger('confidence')->default(100);
            $table->boolean('is_manual')->default(false);
            $table->timestamps();
            $table->index('candidate_id');
            $table->index('technology_id');
            $table->index('normalized_name');
        });

        Schema::create('unrecognized_terms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('candidate_id')->constrained('candidates')->cascadeOnDelete();
            $table->string('term');
            $table->text('context')->nullable();
            $table->string('status', 50)->default('new')->index();
            $table->timestamps();
            $table->index('candidate_id');
        });

        Schema::create('assessments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('request_id')->constrained('requests')->cascadeOnDelete();
            $table->foreignUuid('candidate_id')->constrained('candidates')->cascadeOnDelete();
            $table->unsignedInteger('run_number')->default(1);
            $table->decimal('must_score', 5, 2)->default(0);
            $table->decimal('nice_score', 5, 2)->default(0);
            $table->decimal('total_score', 5, 2)->default(0);
            $table->boolean('has_missing_must_requirements')->default(false);
            $table->string('grade_match_status', 50)->default('unknown');
            $table->string('location_match_status', 50)->default('unknown');
            $table->string('citizenship_match_status', 50)->default('unknown');
            $table->string('status', 50)->default('processing')->index();
            $table->timestamp('calculated_at')->nullable();
            $table->timestamps();
            $table->index('request_id');
            $table->index('candidate_id');
            $table->index(['request_id', 'candidate_id', 'run_number']);
            $table->index(['request_id', 'candidate_id', 'created_at']);
        });

        Schema::create('assessment_requirement_results', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('assessment_id')->constrained('assessments')->cascadeOnDelete();
            $table->foreignUuid('requirement_id')->constrained('requirements')->cascadeOnDelete();
            $table->foreignUuid('matched_candidate_skill_id')->nullable()->constrained('candidate_skills')->nullOnDelete();
            $table->boolean('is_matched')->default(false);
            $table->text('evidence_text')->nullable();
            $table->decimal('score_contribution', 8, 2)->default(0);
            $table->text('comment')->nullable();
            $table->timestamps();
            $table->index('assessment_id');
            $table->index('requirement_id');
            $table->index('matched_candidate_skill_id');
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('entity_type')->nullable();
            $table->uuid('entity_id')->nullable();
            $table->json('metadata')->nullable();
            $table->string('correlation_id')->nullable()->index();
            $table->timestamps();
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('assessment_requirement_results');
        Schema::dropIfExists('assessments');
        Schema::dropIfExists('unrecognized_terms');
        Schema::dropIfExists('candidate_skills');
        Schema::dropIfExists('candidates');
        Schema::dropIfExists('requirements');
        Schema::dropIfExists('requests');
        Schema::dropIfExists('technology_synonyms');
        Schema::dropIfExists('technologies');
        Schema::dropIfExists('users');
    }
};
