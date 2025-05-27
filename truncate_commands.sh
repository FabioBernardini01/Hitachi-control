#!/bin/bash
psql "postgresql://postgres:jaFHlnyvNdVwdTNMjtPdhygSaBWbQQiR@trolley.proxy.rlwy.net:35532/railway" -c "TRUNCATE TABLE commands RESTART IDENTITY CASCADE;"