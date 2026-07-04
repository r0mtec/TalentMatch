<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach ($this->groups() as $name => $groupName) {
            DB::table('technologies')
                ->where('name', $name)
                ->update([
                    'group_name' => $groupName,
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        // Keep the dictionary compatible with the public technology API validation rules.
    }

    private function groups(): array
    {
        return [
            'Node.js' => 'infrastructure',
            'Docker' => 'infrastructure',
            'Kubernetes' => 'infrastructure',
            'AWS' => 'infrastructure',
            'Git' => 'other',
            'CI/CD' => 'infrastructure',
        ];
    }
};
