<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        foreach ($this->technologies() as $item) {
            $technology = DB::table('technologies')->where('name', $item['name'])->first();
            $technologyId = $technology?->id ?? (string) Str::uuid();

            if ($technology === null) {
                DB::table('technologies')->insert([
                    'id' => $technologyId,
                    'name' => $item['name'],
                    'group_name' => $item['group_name'],
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            foreach ($item['synonyms'] as $synonym) {
                if (DB::table('technology_synonyms')->where('normalized_synonym', Str::lower($synonym))->exists()) {
                    continue;
                }

                DB::table('technology_synonyms')->insert([
                    'id' => (string) Str::uuid(),
                    'technology_id' => $technologyId,
                    'synonym' => $synonym,
                    'normalized_synonym' => Str::lower($synonym),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Starter technologies are non-destructive seed data. Keep user-edited dictionaries on rollback.
    }

    private function technologies(): array
    {
        return [
            ['name' => 'PHP', 'group_name' => 'languages', 'synonyms' => []],
            ['name' => 'Laravel', 'group_name' => 'frameworks', 'synonyms' => []],
            ['name' => 'JavaScript', 'group_name' => 'languages', 'synonyms' => ['JS']],
            ['name' => 'TypeScript', 'group_name' => 'languages', 'synonyms' => ['TS']],
            ['name' => 'React', 'group_name' => 'frameworks', 'synonyms' => ['React.js', 'ReactJS']],
            ['name' => 'Vue.js', 'group_name' => 'frameworks', 'synonyms' => ['Vue']],
            ['name' => 'Node.js', 'group_name' => 'infrastructure', 'synonyms' => ['Node', 'NodeJS']],
            ['name' => 'PostgreSQL', 'group_name' => 'databases', 'synonyms' => ['Postgres']],
            ['name' => 'MySQL', 'group_name' => 'databases', 'synonyms' => []],
            ['name' => 'Redis', 'group_name' => 'databases', 'synonyms' => []],
            ['name' => 'Docker', 'group_name' => 'infrastructure', 'synonyms' => []],
            ['name' => 'Kubernetes', 'group_name' => 'infrastructure', 'synonyms' => ['K8s']],
            ['name' => 'AWS', 'group_name' => 'infrastructure', 'synonyms' => ['Amazon Web Services']],
            ['name' => 'Git', 'group_name' => 'other', 'synonyms' => []],
            ['name' => 'CI/CD', 'group_name' => 'infrastructure', 'synonyms' => ['CI CD']],
        ];
    }
};
