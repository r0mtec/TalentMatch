<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('talentmatch:about', fn () => $this->info('TalentMatch report service'));
