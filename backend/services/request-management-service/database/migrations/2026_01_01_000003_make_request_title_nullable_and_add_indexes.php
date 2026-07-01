<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->string('title')->nullable()->change();
            $table->index('grade');
            $table->index('created_at');
        });

        Schema::table('candidates', function (Blueprint $table) {
            $table->index('grade');
            $table->index('location');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->dropIndex(['grade']);
            $table->dropIndex(['created_at']);
            $table->string('title')->nullable(false)->change();
        });

        Schema::table('candidates', function (Blueprint $table) {
            $table->dropIndex(['grade']);
            $table->dropIndex(['location']);
            $table->dropIndex(['created_at']);
        });
    }
};
